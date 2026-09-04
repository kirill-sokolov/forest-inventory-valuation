#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { extractContract } from "../engine/contracts/extract";
import type { DocumentType } from "../engine/contracts/schema";
import { extractPdfText } from "../engine/pdf/extract-text";
import type { ExtractedPdfText } from "../engine/pdf/extract-text.shared";

const USAGE =
  "Lietošana: npx tsx cli/contract-extract.ts <līgums.pdf> [--type purchase|lease|other]";

export interface ContractCliArguments {
  pdfPath: string;
  documentTypeHint?: DocumentType;
}

function isDocumentType(value: string): value is DocumentType {
  return value === "purchase" || value === "lease" || value === "other";
}

export function parseContractCliArgs(args: readonly string[]): ContractCliArguments {
  let pdfPath: string | undefined;
  let documentTypeHint: DocumentType | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--type") {
      const value = args[index + 1];
      if (!value || !isDocumentType(value)) {
        throw new Error(`Nederīgs līguma veids. ${USAGE}`);
      }
      documentTypeHint = value;
      index += 1;
      continue;
    }
    if (argument?.startsWith("--type=")) {
      const value = argument.slice("--type=".length);
      if (!isDocumentType(value)) {
        throw new Error(`Nederīgs līguma veids. ${USAGE}`);
      }
      documentTypeHint = value;
      continue;
    }
    if (argument?.startsWith("--")) {
      throw new Error(`Nezināms parametrs: ${argument}. ${USAGE}`);
    }
    if (argument) {
      if (pdfPath) throw new Error(USAGE);
      pdfPath = argument;
    }
  }

  if (!pdfPath) throw new Error(USAGE);
  if (!pdfPath.toLocaleLowerCase("lv").endsWith(".pdf")) {
    throw new Error("Līguma failam jābūt PDF formātā.");
  }

  return { pdfPath, documentTypeHint };
}

export function pageMarkedContractText(extracted: ExtractedPdfText): string {
  return Array.from({ length: extracted.pageCount }, (_, pageIndex) => {
    const page = pageIndex + 1;
    const pageText = extracted.positionedLines
      .filter((line) => line.page === page)
      .map((line) => line.str)
      .join("\n");
    return `[PAGE ${page}]\n${pageText}`;
  }).join("\n\n");
}

export async function runContractExtractCli(
  args: readonly string[],
  apiKey: string | undefined = process.env.OPENROUTER_API_KEY,
): Promise<string> {
  const options = parseContractCliArgs(args);
  const file = await readFile(options.pdfPath);
  const extracted = await extractPdfText(new Uint8Array(file));
  if (extracted.text.trim().length === 0) {
    throw new Error("PDF failā nav teksta slāņa; dokuments jāpārbauda manuāli.");
  }

  const analysis = await extractContract(pageMarkedContractText(extracted), {
    apiKey,
    documentTypeHint: options.documentTypeHint,
    fileName: path.basename(options.pdfPath),
  });
  return JSON.stringify(analysis, null, 2);
}

async function main(): Promise<void> {
  try {
    process.stdout.write(`${await runContractExtractCli(process.argv.slice(2))}\n`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nezināma kļūda.";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  await main();
}
