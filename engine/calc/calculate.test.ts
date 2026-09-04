import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Inventory } from "../inventory/types";
import { createDefaultAssortmentMatrix, setAssortmentCell } from "./assortments";
import { calculate } from "./index";

interface CalculationOracle extends Inventory {
  volumes: {
    "current-2024"?: {
      byStand: Record<string, number>;
      total: number;
      totalWithoutFlagged: number;
    };
    byStand?: Record<string, number>;
    total?: number;
    totalWithoutFlagged?: number;
  };
  speciesTotals: Record<string, number>;
  matrixColumnsTotals: Record<string, number>;
  finance: {
    revenue: number;
    revenueBySpeciesColumn?: Record<string, number>;
    revenueRows: Record<string, number>;
    costs: Record<string, number>;
    profitRate: number;
    profit: number;
    maxPurchase: number;
    pricePerM3: number;
  };
  warnings: Array<{ code: string }>;
}

function readOracle(path: string): CalculationOracle {
  return JSON.parse(readFileSync(path, "utf8")) as CalculationOracle;
}

function verifyCalculation(oracle: CalculationOracle, isPublic: boolean): void {
  const result = calculate(oracle);
  const expectedVolumes = isPublic ? oracle.volumes["current-2024"] : oracle.volumes;
  expect(result.totalVolumeM3).toBeCloseTo(expectedVolumes?.total ?? 0, 8);
  expect(result.alternativeWithoutFlagged.totalVolumeM3).toBeCloseTo(
    expectedVolumes?.totalWithoutFlagged ?? 0,
    8,
  );
  for (const [standNumber, volume] of Object.entries(expectedVolumes?.byStand ?? {})) {
    expect(
      result.stands.find((entry) => entry.stand.number === Number(standNumber))?.volumeM3,
    ).toBeCloseTo(volume, 8);
  }
  for (const [code, volume] of Object.entries(oracle.speciesTotals)) {
    expect(result.speciesVolumes[code]).toBeCloseTo(volume, 8);
  }
  for (const [column, volume] of Object.entries(oracle.matrixColumnsTotals)) {
    expect(
      result.matrixColumnVolumes[column as keyof typeof result.matrixColumnVolumes],
    ).toBeCloseTo(volume, 8);
  }
  for (const [rowName, revenue] of Object.entries(oracle.finance.revenueRows)) {
    const actual = result.assortments.rows.find((row) => row.name === rowName)?.revenueEur;
    expect(actual).toBeDefined();
    if (isPublic) expect(actual).toBeCloseTo(revenue, 1);
    else expect(Math.abs((actual ?? 0) - revenue)).toBeLessThanOrEqual(1);
  }
  expect(result.finance.revenueEur).toBeCloseTo(oracle.finance.revenue, 0);
  expect(result.finance.costs.totalEur).toBeCloseTo(oracle.finance.costs.total, 8);
  expect(result.finance.costs.cirsanaEur).toBeCloseTo(oracle.finance.costs.cirsana ?? 0, 8);
  expect(result.finance.costs.pievesanaEur).toBeCloseTo(oracle.finance.costs.pievesana ?? 0, 8);
  expect(result.finance.costs.transportsEur).toBeCloseTo(oracle.finance.costs.transports ?? 0, 8);
  expect(result.finance.profitEur).toBeCloseTo(oracle.finance.profit, 0);
  expect(result.finance.maxPurchaseEur).toBeCloseTo(oracle.finance.maxPurchase, 0);
  expect(result.finance.pricePerM3Eur).toBeCloseTo(oracle.finance.pricePerM3, 2);
  expect(result.warnings.map((warning) => warning.code)).toEqual(
    oracle.warnings.map((warning) => warning.code),
  );
}

describe("forest valuation calculation", () => {
  it("matches the complete public oracle", () => {
    const oracle = readOracle("samples/expected/inventory-paraugmezs.json");
    verifyCalculation(oracle, true);
    const result = calculate(oracle);
    for (const [column, expected] of Object.entries(oracle.finance.revenueBySpeciesColumn ?? {})) {
      expect(
        result.assortments.revenueByColumnEur[
          column as keyof typeof result.assortments.revenueByColumnEur
        ],
      ).toBeCloseTo(expected, 2);
    }
    expect(result.assortments.unpricedM3["Oz/Os"]).toBeCloseTo(31.5, 8);
    expect(result.warnings).toEqual([
      expect.objectContaining({
        code: "protection-zone",
        stand: 5,
        anchor: "stand-5-include",
        alternativeTotalM3: 518,
      }),
      expect.objectContaining({ code: "coefficient-sum", stand: 6, sum: 9 }),
      expect.objectContaining({
        code: "matrix-column-sum",
        column: "Oz/Os",
        sumPercent: 70,
        unpricedM3: 31.5,
        hint: "Kamīnmalka",
        message: expect.stringContaining("31,50 m³ nav novērtēti"),
      }),
      expect.objectContaining({
        code: "edition-note",
        flips: [1],
        message:
          "Uzdevuma redakcijā (līdz 29.06.2022) 1. nogabals būtu cērtams (caurmērs 28 ≥ 27); spēkā esošajā — nē (nepieciešami 30 cm)",
      }),
    ]);
    expect(calculate(oracle, { edition: "task-pre-2022" }).totalVolumeM3).toBe(1_025);
  });

  it.skipIf(!existsSync("samples/private/expected-inventory-client.json"))(
    "matches the guarded private oracle",
    () => verifyCalculation(readOracle("samples/private/expected-inventory-client.json"), false),
  );

  it("recalculates when the missing Oz/Os share is filled", () => {
    const oracle = readOracle("samples/expected/inventory-paraugmezs.json");
    const matrix = setAssortmentCell(createDefaultAssortmentMatrix(), "Kamīnmalka", "Oz/Os", {
      sharePercent: 30,
    });
    const baseline = calculate(oracle);
    const edited = calculate(oracle, { matrix });
    expect(edited.finance.revenueEur - baseline.finance.revenueEur).toBeCloseTo(1_575, 8);
    expect(edited.warnings.some((warning) => warning.code === "matrix-column-sum")).toBe(false);
  });

  it("recalculates profit without rounding intermediate values", () => {
    const oracle = readOracle("samples/expected/inventory-paraugmezs.json");
    const baseline = calculate(oracle);
    const edited = calculate(oracle, { profitRate: 0.2 });
    expect(edited.finance.profitEur).toBeCloseTo(baseline.finance.profitEur * 2, 8);
    expect(edited.finance.maxPurchaseEur).toBeCloseTo(
      baseline.finance.maxPurchaseEur - baseline.finance.profitEur,
      8,
    );
  });

  it("recalculates cost rates and the profit margin together", () => {
    const oracle = readOracle("samples/expected/inventory-paraugmezs.json");
    const baseline = calculate(oracle);
    const edited = calculate(oracle, { costsPerM3: { cirsana: 12 } });
    expect(edited.finance.costs.totalEur - baseline.finance.costs.totalEur).toBe(689);
    expect(baseline.finance.maxPurchaseEur - edited.finance.maxPurchaseEur).toBeCloseTo(620.1, 8);
  });

  it("can exclude a flagged stand through settings", () => {
    const oracle = readOracle("samples/expected/inventory-paraugmezs.json");
    const result = calculate(oracle, { includeFlagged: false });
    expect(result.totalVolumeM3).toBe(518);
    expect(result.includedStandNumbers).toEqual([2, 3, 7, 8]);
  });

  it("warns and accounts for a positive share without a price", () => {
    const oracle = readOracle("samples/expected/inventory-paraugmezs.json");
    const matrix = setAssortmentCell(createDefaultAssortmentMatrix(), "Finieris A", "B", {
      priceEurM3: null,
    });
    const result = calculate(oracle, { matrix });

    expect(Number.isFinite(result.finance.maxPurchaseEur)).toBe(true);
    expect(result.assortments.unpricedM3.B).toBeCloseTo(12.695, 8);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "matrix-missing-price",
        assortment: "Finieris A",
        column: "B",
        affectedVolumeM3: 12.695,
        anchor: "matrix-finieris-a-b",
      }),
    );
  });

  it("contains non-finite matrix input and renders a warning", () => {
    const oracle = readOracle("samples/expected/inventory-paraugmezs.json");
    const matrix = setAssortmentCell(createDefaultAssortmentMatrix(), "Finieris A", "B", {
      sharePercent: Number.NaN,
    });
    const result = calculate(oracle, { matrix });

    expect(Number.isFinite(result.finance.revenueEur)).toBe(true);
    expect(Number.isFinite(result.finance.maxPurchaseEur)).toBe(true);
    expect(result.warnings).toContainEqual(
      expect.objectContaining({
        code: "matrix-invalid-value",
        assortment: "Finieris A",
        column: "B",
        field: "sharePercent",
      }),
    );
  });
});
