import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdfText } from "./extract-text";

const privatePdfPath = path.resolve("samples/private/inventory-client.pdf");

describe.skipIf(!existsSync(privatePdfPath))("Node PDF text extraction", () => {
  it("extracts normalized positioned text and a line view", async () => {
    const bytes = await readFile(privatePdfPath);
    const result = await extractPdfText(bytes);

    expect(result.pageCount).toBeGreaterThanOrEqual(2);
    expect(result.items.length).toBeGreaterThan(0);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        page: expect.any(Number),
        x: expect.any(Number),
        y: expect.any(Number),
        str: expect.any(String),
      }),
    );
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines).toContain("Nogabalu raksturojošie rādītāji");
    expect(result.positionedLines[0]).toEqual(
      expect.objectContaining({ page: expect.any(Number), y: expect.any(Number) }),
    );
    expect(result.text).toContain("Nogabalu raksturojošie rādītāji");
    expect(result.text).toContain("4Ba3B37");
    expect(result.text).toContain("1A47");
    expect(result.text).not.toContain("Ɵ");
    expect(bytes.byteLength).toBeGreaterThan(0);
  });
});
