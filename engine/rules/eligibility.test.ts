import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Inventory, Stand } from "../inventory/types";
import {
  compareEligibilityEditions,
  evaluateInventoryEligibility,
  evaluateStandEligibility,
} from "./eligibility";

interface EligibilityOracle extends Inventory {
  eligibility: {
    eligible?: number[];
    notEligible?: number[];
    notAssessed?: number[];
    reasons?: Record<string, string>;
    "current-2024"?: {
      eligible: number[];
      notEligible: number[];
      notAssessed: number[];
      reasons: Record<string, string>;
    };
    flipsBetweenEditions: number[];
  };
}

function readOracle(path: string): EligibilityOracle {
  return JSON.parse(readFileSync(path, "utf8")) as EligibilityOracle;
}

function numbersByStatus(
  oracle: EligibilityOracle,
  status: "eligible" | "not-eligible" | "not-assessed",
): number[] {
  return evaluateInventoryEligibility(oracle, "current-2024")
    .verdicts.filter((entry) => entry.verdict.status === status)
    .map((entry) => entry.stand.number);
}

describe("clear-cut eligibility", () => {
  it("matches public eligibility, traces, and edition flip", () => {
    const oracle = readOracle("samples/expected/inventory-paraugmezs.json");
    const expected = oracle.eligibility["current-2024"];
    expect(expected).toBeDefined();
    expect(numbersByStatus(oracle, "eligible")).toEqual(expected?.eligible);
    expect(numbersByStatus(oracle, "not-eligible")).toEqual(expected?.notEligible);
    expect(numbersByStatus(oracle, "not-assessed")).toEqual(expected?.notAssessed);

    const result = evaluateInventoryEligibility(oracle, "current-2024");
    for (const [number, trace] of Object.entries(expected?.reasons ?? {})) {
      expect(
        result.verdicts.find((entry) => entry.stand.number === Number(number))?.verdict.trace,
      ).toBe(trace);
    }
    expect(compareEligibilityEditions(oracle).standNumbers).toEqual([1]);
  });

  it.skipIf(!existsSync("samples/private/expected-inventory-client.json"))(
    "matches private eligibility in both editions",
    () => {
      const oracle = readOracle("samples/private/expected-inventory-client.json");
      for (const edition of ["current-2024", "task-pre-2022"] as const) {
        const result = evaluateInventoryEligibility(oracle, edition);
        expect(result.eligible.map((entry) => entry.stand.number)).toEqual(
          oracle.eligibility.eligible,
        );
        expect(result.notEligible.map((entry) => entry.stand.number)).toEqual(
          oracle.eligibility.notEligible,
        );
        expect(result.notAssessed.map((entry) => entry.stand.number)).toEqual(
          oracle.eligibility.notAssessed,
        );
      }
      const current = evaluateInventoryEligibility(oracle, "current-2024");
      for (const [number, trace] of Object.entries(oracle.eligibility.reasons ?? {})) {
        expect(
          current.verdicts.find((entry) => entry.stand.number === Number(number))?.verdict.trace,
        ).toBe(trace);
      }
      expect(compareEligibilityEditions(oracle).standNumbers).toEqual([]);
    },
  );

  it("uses the currently applicable diameter for pine in bonitate III", () => {
    const stand = makeStand({ formulaRaw: "10P60", bonitate: "III", ageYears: 60, diameterCm: 28 });
    expect(evaluateStandEligibility(stand, "current-2024").status).toBe("not-eligible");
    expect(evaluateStandEligibility(stand, "task-pre-2022")).toEqual(
      expect.objectContaining({ status: "eligible", eligibleBy: "diameter" }),
    );
  });

  it("uses the lower age limit for birch in bonitate IV", () => {
    const stand = makeStand({ formulaRaw: "10B52", bonitate: "IV", ageYears: 52 });
    expect(evaluateStandEligibility(stand, "current-2024")).toEqual(
      expect.objectContaining({ status: "eligible", eligibleBy: "age" }),
    );
  });

  it("does not assess a stand without a formula", () => {
    expect(evaluateStandEligibility(makeStand({ formulaRaw: null }), "current-2024").status).toBe(
      "not-assessed",
    );
  });

  it("does not make an unknown dominant species eligible", () => {
    const verdict = evaluateStandEligibility(
      makeStand({ formulaRaw: "7Xx3B40", ageYears: 140, diameterCm: 50 }),
      "current-2024",
    );
    expect(verdict.status).toBe("not-eligible");
    expect(verdict.warnings).toContainEqual(expect.objectContaining({ code: "unknown-species" }));
  });
});

function makeStand(overrides: Partial<Stand>): Stand {
  return {
    number: 1,
    areaHa: 1,
    landKind: "Mežaudze",
    forestType: "Dm",
    formulaRaw: "10B70",
    origin: "D",
    bonitate: "I",
    heightM: 25,
    diameterCm: 20,
    ageYears: 70,
    density: 7,
    basalAreaM2Ha: 20,
    treesPerHa: null,
    stockM3Ha: 200,
    notes: {},
    flags: [],
    ...overrides,
  };
}
