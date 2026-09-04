#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { calculate } from "../engine/calc/index";
import { parseInventory } from "../engine/inventory/parse";
import { extractPdfText } from "../engine/pdf/extract-text";
import { serializeJsonReport } from "../engine/report/json";
import { createTextReport } from "../engine/report/text";

export async function runForestReportCli(args: readonly string[]): Promise<string> {
  const json = args.includes("--json");
  const pdfPath = args.find((argument) => !argument.startsWith("--"));
  if (!pdfPath) {
    throw new Error("Lietošana: npx tsx cli/forest-report.ts <inventarizācija.pdf> [--json]");
  }
  if (!pdfPath.toLocaleLowerCase("lv").endsWith(".pdf")) {
    throw new Error("Inventarizācijas failam jābūt PDF formātā.");
  }

  const file = await readFile(pdfPath);
  const extracted = await extractPdfText(new Uint8Array(file));
  const inventory = parseInventory(extracted);
  const calculation = calculate(inventory);
  return json
    ? serializeJsonReport(inventory, calculation)
    : createTextReport(inventory, calculation);
}

async function main(): Promise<void> {
  try {
    process.stdout.write(`${await runForestReportCli(process.argv.slice(2))}\n`);
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
