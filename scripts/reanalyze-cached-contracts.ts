/**
 * Re-runs deterministic validation (including quote grounding against the PDF text) for the
 * committed synthetic contract samples and rewrites `samples/expected/*.extracted.json`.
 * The extracted `data` never changes here; only issues, needsReview and the summary do.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { pageMarkedContractText } from "../cli/contract-extract";
import { analyzeContract } from "../engine/contracts/extract";
import { contractExtractionSchema } from "../engine/contracts/schema";
import { extractPdfText } from "../engine/pdf/extract-text";

const names = ["synthetic-pirkuma-ligums", "synthetic-nomas-ligums", "synthetic-pirkuma-nepilns"];

for (const name of names) {
  const cachedPath = path.resolve("samples/expected", `contract-${name}.extracted.json`);
  const cached = JSON.parse(await readFile(cachedPath, "utf8")) as {
    data: unknown;
    model: string | null;
  };
  const data = contractExtractionSchema.parse(cached.data);
  const extracted = await extractPdfText(
    new Uint8Array(await readFile(path.resolve("samples/contracts", `${name}.pdf`))),
  );
  const analysis = analyzeContract(data, cached.model, pageMarkedContractText(extracted));
  await writeFile(cachedPath, `${JSON.stringify(analysis, null, 2)}\n`);
  process.stdout.write(
    `${name}: needsReview=${analysis.needsReview} issues=${analysis.issues.map((issue) => issue.code).join(",") || "-"}\n`,
  );
}
