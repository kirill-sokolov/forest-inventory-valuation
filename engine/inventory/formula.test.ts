import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseCompositionFormula } from "./formula";

interface FormulaExpectation {
  shares: Record<string, number>;
  dominant: string;
  coefficientSum?: number;
  warnings?: string[];
  groupAges?: number[];
}

interface FormulaOracle {
  quarters: Array<{ stands: Array<{ number: number; formulaRaw: string | null }> }>;
  formulas: Record<string, FormulaExpectation>;
}

function readOracle(path: string): FormulaOracle {
  return JSON.parse(readFileSync(path, "utf8")) as FormulaOracle;
}

function verifyOracleFormulas(oracle: FormulaOracle): void {
  const stands = oracle.quarters.flatMap((quarter) => quarter.stands);
  for (const [standNumber, expected] of Object.entries(oracle.formulas)) {
    const stand = stands.find((candidate) => candidate.number === Number(standNumber));
    expect(stand?.formulaRaw, `stand ${standNumber} formula`).toBeTruthy();
    const parsed = parseCompositionFormula(stand?.formulaRaw ?? null);
    expect(parsed.sharesTenths).toEqual(expected.shares);
    expect(parsed.dominantSpecies).toBe(expected.dominant);
    expect(parsed.coefficientSum).toBe(expected.coefficientSum ?? 10);
    expect(parsed.warnings.map((warning) => warning.code)).toEqual(expected.warnings ?? []);
    if (expected.groupAges) {
      expect(parsed.groups.map((group) => group.ageYears)).toEqual(expected.groupAges);
    }
  }
}

describe("composition formula", () => {
  it("matches every formula in the public oracle", () => {
    verifyOracleFormulas(readOracle("samples/expected/inventory-paraugmezs.json"));
  });

  it.skipIf(!existsSync("samples/private/expected-inventory-client.json"))(
    "matches every formula in the private oracle",
    () => {
      verifyOracleFormulas(readOracle("samples/private/expected-inventory-client.json"));
    },
  );

  it("parses a single coefficient of ten", () => {
    const parsed = parseCompositionFormula("10E");
    expect(parsed.sharesTenths).toEqual({ E: 10 });
    expect(parsed.dominantSpecies).toBe("E");
    expect(parsed.warnings).toEqual([]);
  });

  it("keeps an incomplete coefficient sum and warns in Latvian", () => {
    const parsed = parseCompositionFormula("3P3E3B");
    expect(parsed.sharesTenths).toEqual({ P: 3, E: 3, B: 3 });
    expect(parsed.coefficientSum).toBe(9);
    expect(parsed.warnings).toContainEqual(
      expect.objectContaining({
        code: "coefficient-sum",
        coefficientSum: 9,
        message: expect.stringContaining("summa ir 9"),
      }),
    );
  });

  it("maps an unknown code to Citi and warns", () => {
    const parsed = parseCompositionFormula("7Xx3B40");
    expect(parsed.dominantSpecies).toBe("Xx");
    expect(parsed.species.find((species) => species.code === "Xx")?.matrixColumn).toBe("Citi");
    expect(parsed.warnings).toContainEqual(
      expect.objectContaining({ code: "unknown-species", speciesCode: "Xx" }),
    );
  });

  it("records +X admixtures with zero share", () => {
    const parsed = parseCompositionFormula("8P2E+B");
    expect(parsed.sharesTenths).toEqual({ P: 8, E: 2 });
    expect(parsed.admixtures).toEqual(["B"]);
    expect(parsed.species.find((species) => species.code === "B")).toEqual(
      expect.objectContaining({ coefficientTenths: 0, admixture: true }),
    );
  });
});
