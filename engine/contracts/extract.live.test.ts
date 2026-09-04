import { readFile } from "node:fs/promises";
import path from "node:path";

import { extractText, getDocumentProxy } from "unpdf";
import { expect, it } from "vitest";

import { extractContract } from "./extract";
import { contractExtractionSchema } from "./schema";

const hasKey = Boolean(process.env.OPENROUTER_API_KEY);

it.skipIf(!hasKey)("extracts at least 90% of known purchase fields", async () => {
  const expected = contractExtractionSchema.parse(
    JSON.parse(
      await readFile(
        path.resolve("samples/expected/contract-synthetic-pirkuma-ligums.json"),
        "utf8",
      ),
    ),
  );
  const bytes = await readFile(path.resolve("samples/contracts/synthetic-pirkuma-ligums.pdf"));
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const pages = await extractText(pdf);
  const pageText = Array.isArray(pages.text) ? pages.text : [pages.text];
  const markedText = pageText.map((text, index) => `[PAGE ${index + 1}]\n${text}`).join("\n\n");

  const result = await extractContract(markedText, {
    fileName: "synthetic-pirkuma-ligums.pdf",
    documentTypeHint: "purchase",
  });
  const checks = [
    result.data.document.type.value === expected.document.type.value,
    result.data.document.signedAt.value === expected.document.signedAt.value,
    result.data.document.place.value === expected.document.place.value,
    result.data.parties[0]?.name.value === expected.parties[0]?.name.value,
    result.data.parties[0]?.registrationNumber.value ===
      expected.parties[0]?.registrationNumber.value,
    result.data.parties[1]?.name.value === expected.parties[1]?.name.value,
    result.data.object.address.value === expected.object.address.value,
    result.data.object.cadastreNumber.value === expected.object.cadastreNumber.value,
    result.data.object.area.value?.value === expected.object.area.value?.value,
    result.data.financials.price.value?.amount === expected.financials.price.value?.amount,
  ];
  expect(checks.filter(Boolean).length).toBeGreaterThanOrEqual(9);
});
