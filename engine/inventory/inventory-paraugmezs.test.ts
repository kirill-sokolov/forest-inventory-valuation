import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import fixture from "../../samples/expected/inventory-paraugmezs.json";
import { calculate } from "../calc";
import { extractPdfText } from "../pdf/extract-text";
import { createHeadlineLines } from "../report/text";
import { parseInventory } from "./parse";
import type { Inventory } from "./types";

describe("inventory-paraugmezs public sample", () => {
  it("round-trips the PDF and produces the public headline", async () => {
    const extracted = await extractPdfText(await readFile("samples/inventory-paraugmezs.pdf"));
    const inventory = parseInventory(extracted);
    const expected = fixture as unknown as Inventory;

    expect(inventory.property).toEqual(expected.property);
    expect(inventory.totals).toEqual(expected.totals);
    expect(inventory.quarters.flatMap((quarter) => quarter.stands)).toHaveLength(8);
    expect(createHeadlineLines(inventory, calculate(inventory))).toEqual(
      fixture.report.headlineLines,
    );
  });
});
