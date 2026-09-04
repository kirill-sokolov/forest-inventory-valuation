import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { extractPdfText } from "../engine/pdf/extract-text";
import {
  pageMarkedContractText,
  parseContractCliArgs,
  runContractExtractCli,
} from "./contract-extract";

describe("contract extraction CLI", () => {
  it("preserves page boundaries and known values from a synthetic PDF", async () => {
    const bytes = await readFile(path.resolve("samples/contracts/synthetic-nomas-ligums.pdf"));
    const extracted = await extractPdfText(new Uint8Array(bytes));
    const text = pageMarkedContractText(extracted);

    expect(text).toContain("[PAGE 1]");
    expect(text).toContain("[PAGE 2]");
    expect(text).toContain("SIA Miera Telpas");
    expect(text).toContain("650,00 EUR");
  });

  it("parses an optional document type hint", () => {
    expect(parseContractCliArgs(["paraugs.pdf", "--type", "lease"])).toEqual({
      pdfPath: "paraugs.pdf",
      documentTypeHint: "lease",
    });
    expect(parseContractCliArgs(["paraugs.pdf", "--type=purchase"])).toEqual({
      pdfPath: "paraugs.pdf",
      documentTypeHint: "purchase",
    });
  });

  it("fails locally when the API key is missing", async () => {
    await expect(
      runContractExtractCli(
        ["samples/contracts/synthetic-pirkuma-ligums.pdf", "--type", "purchase"],
        "",
      ),
    ).rejects.toThrow("OPENROUTER_API_KEY");
  });
});
