import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractPdfText } from "../pdf/extract-text";
import { parseInventory } from "./parse";
import type { Inventory } from "./types";

const privatePdfPath = path.resolve("samples/private/inventory-client.pdf");
const privateExpectedPath = path.resolve("samples/private/expected-inventory-client.json");
const publicPdfPath = path.resolve("samples/inventory-paraugmezs.pdf");
const publicExpectedPath = path.resolve("samples/expected/inventory-paraugmezs.json");

interface InventoryOracle extends Inventory {
  quarters: Array<{
    number: number;
    stands: Array<
      Inventory["quarters"][number]["stands"][number] & { formulaLinesInPdf?: string[] }
    >;
  }>;
}

describe("inventory parser", () => {
  it("parses multiple quarters, wrapped formulas, notes, and non-forest rows", () => {
    const text = `
Nogabalu raksturojošie rādītāji
Zemes vienības apzīmējums- 00000000042
Zemes vienība 00000000042 inv. veikta 2026. gadā Īpašums - 00000000041 - Paraugmežs
Paraugu pagasts Saimniecība: Paraugu saimniecība
1. kvartāls
1 1,20 Mežaudze Ln 6P3E1B95 D III 22 28 95 7 26 280
Platību sadalījums: t.sk. mežs 1,20 ha, t.sk. ceļi 0 ha, t.sk. grāvji 0 ha
2 0,30 Pļava
Platību sadalījums: t.sk. mežs 0 ha, t.sk. ceļi 0 ha, t.sk. grāvji 0 ha
Kopā platība kvartālā (ha): 1,50 Platību sadalījums: t.sk. mežs 1,20 ha, t.sk. ceļi 0 ha, t.sk. grāvji 0 ha
2. kvartāls
3 0,50 Mežaudze Vr 4Ba3B30
2E1A25
D I 17 15 30 9 23 190
Aizs.paz.- 40022000 Aizsargjosla gar ūdeņiem
Platību sadalījums: t.sk. mežs 0,50 ha, t.sk. ceļi 0 ha, t.sk. grāvji 0 ha
Pavisam kopā (ha): 2,00 Platību sadalījums: t.sk. mežs 1,70 ha, t.sk. ceļi 0 ha, t.sk. grāvji 0 ha
`;

    const inventory = parseInventory(text);

    expect(inventory.property).toEqual({
      landUnit: "00000000042",
      propertyCadastre: "00000000041",
      propertyName: "Paraugmežs",
      parish: "Paraugu",
      farm: "Paraugu saimniecība",
      inventoryYear: 2026,
    });
    expect(inventory.totals).toEqual({
      totalHa: 2,
      forestHa: 1.7,
      roadsHa: 0,
      ditchesHa: 0,
    });
    expect(inventory.quarters.map(({ number }) => number)).toEqual([1, 2]);
    expect(inventory.quarters[0]?.stands).toHaveLength(2);
    expect(inventory.quarters[0]?.stands[1]).toEqual(
      expect.objectContaining({
        number: 2,
        areaHa: 0.3,
        landKind: "Pļava",
        formulaRaw: null,
        flags: ["non-forest"],
      }),
    );
    expect(inventory.quarters[1]?.stands[0]).toEqual(
      expect.objectContaining({
        number: 3,
        formulaRaw: "4Ba3B30 2E1A25",
        stockM3Ha: 190,
        notes: {
          protection: {
            code: "40022000",
            text: "Aizsargjosla gar ūdeņiem",
          },
          areaBreakdown: { forestHa: 0.5, roadsHa: 0, ditchesHa: 0 },
        },
        flags: ["protection-zone"],
      }),
    );
  });

  it("marks a forest stand without a composition formula", () => {
    const text = `
Nogabalu raksturojošie rādītāji
Zemes vienības apzīmējums- 00000000042
Zemes vienība 00000000042 inv. veikta 2026. gadā Īpašums - 00000000041 - Paraugmežs
Paraugu pagasts Saimniecība: Paraugmežs
1. kvartāls
1 1,00 Mežaudze Ln D III 22 28 95 7 26 280
Platību sadalījums: t.sk. mežs 1,00 ha, t.sk. ceļi 0 ha, t.sk. grāvji 0 ha
Pavisam kopā (ha): 1,00 Platību sadalījums: t.sk. mežs 1,00 ha, t.sk. ceļi 0 ha, t.sk. grāvji 0 ha
`;

    expect(parseInventory(text).quarters[0]?.stands[0]).toEqual(
      expect.objectContaining({
        formulaRaw: null,
        origin: "D",
        stockM3Ha: 280,
        flags: ["no-formula"],
      }),
    );
  });

  it("parses the generated public inventory PDF", async () => {
    const bytes = await readFile(publicPdfPath);
    const parsed = parseInventory(await extractPdfText(bytes));
    const oracle = JSON.parse(await readFile(publicExpectedPath, "utf8")) as InventoryOracle;
    const expectedQuarters = oracle.quarters.map((quarter) => ({
      number: quarter.number,
      stands: quarter.stands.map((stand) => {
        const { formulaLinesInPdf: _generatorHint, ...inventoryStand } = stand;
        return inventoryStand;
      }),
    }));

    expect(parsed).toEqual({
      property: oracle.property,
      totals: oracle.totals,
      quarters: expectedQuarters,
    });
  });

  describe.skipIf(!existsSync(privatePdfPath) || !existsSync(privateExpectedPath))(
    "private inventory oracle",
    () => {
      it("matches the expected property, totals, quarters, stands, and notes", async () => {
        const bytes = new Uint8Array(await readFile(privatePdfPath));
        const extracted = await extractPdfText(bytes);
        const parsed = parseInventory(extracted);
        const oracle = JSON.parse(await readFile(privateExpectedPath, "utf8")) as Inventory &
          Record<string, unknown>;

        expect(parsed).toEqual({
          property: oracle.property,
          totals: oracle.totals,
          quarters: oracle.quarters,
        });
      });
    },
  );
});
