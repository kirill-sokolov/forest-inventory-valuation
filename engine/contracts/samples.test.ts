import { readFile } from "node:fs/promises";
import path from "node:path";

import { extractText, getDocumentProxy } from "unpdf";
import { describe, expect, it } from "vitest";

import { pageMarkedContractText } from "../../cli/contract-extract";
import { extractPdfText } from "../pdf/extract-text";
import { contractExtractionSchema } from "./schema";
import { validateContract } from "./validate";

const sampleCases = [
  {
    name: "synthetic-pirkuma-ligums",
    needles: ["SIA Zaļais Nams", "00000000011", "48 500,00 EUR"],
  },
  {
    name: "synthetic-nomas-ligums",
    needles: ["SIA Miera Telpas", "00000000022", "650,00 EUR"],
  },
  {
    name: "synthetic-pirkuma-nepilns",
    needles: ["SIA Drošs Pircējs", "0000-ABC-33"],
  },
] as const;

describe("committed synthetic contract samples", () => {
  for (const sample of sampleCases) {
    it(`${sample.name}.pdf has a real text layer with its known values`, async () => {
      const pdfPath = path.resolve("samples/contracts", `${sample.name}.pdf`);
      const bytes = await readFile(pdfPath);
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const extracted = await extractText(pdf, { mergePages: true });
      expect(extracted.totalPages).toBeGreaterThanOrEqual(1);
      expect(typeof extracted.text).toBe("string");
      for (const value of sample.needles) expect(extracted.text).toContain(value);
    });

    it(`${sample.name} has valid known and cached JSON`, async () => {
      const knownPath = path.resolve("samples/expected", `contract-${sample.name}.json`);
      const cachedPath = path.resolve("samples/expected", `contract-${sample.name}.extracted.json`);
      const known = contractExtractionSchema.parse(JSON.parse(await readFile(knownPath, "utf8")));
      const cached = JSON.parse(await readFile(cachedPath, "utf8")) as { data?: unknown };
      expect(contractExtractionSchema.parse(cached.data)).toEqual(known);
    });
  }

  it("the incomplete purchase yields the expected deterministic issues", async () => {
    const file = await readFile(
      path.resolve("samples/expected/contract-synthetic-pirkuma-nepilns.json"),
      "utf8",
    );
    const contract = contractExtractionSchema.parse(JSON.parse(file));
    const validation = validateContract(contract);
    expect(validation.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing-purchase-price", severity: "error" }),
        expect.objectContaining({ code: "cadastre-format", severity: "warning" }),
      ]),
    );
  });
});

describe("cached demo results are grounded in their PDFs", () => {
  for (const sample of sampleCases) {
    it(`${sample.name} cached issues equal a fresh grounded validation`, async () => {
      const cachedPath = path.resolve("samples/expected", `contract-${sample.name}.extracted.json`);
      const cached = JSON.parse(await readFile(cachedPath, "utf8")) as {
        data: unknown;
        issues: unknown;
        needsReview: boolean;
      };
      const data = contractExtractionSchema.parse(cached.data);
      const extracted = await extractPdfText(
        new Uint8Array(await readFile(path.resolve("samples/contracts", `${sample.name}.pdf`))),
      );
      const validation = validateContract(data, pageMarkedContractText(extracted));
      expect(cached.issues).toEqual(validation.issues);
      expect(cached.needsReview).toBe(validation.needsReview);
      expect(validation.issues.map((issue) => issue.code)).not.toContain("quote-not-found");
    });
  }
});
