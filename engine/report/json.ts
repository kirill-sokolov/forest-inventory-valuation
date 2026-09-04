import type { CalculationResult } from "../calc";
import type { Inventory } from "../inventory/types";
import { createHeadlineLines } from "./text";

export interface ForestJsonReport {
  version: 1;
  property: Inventory["property"];
  edition: CalculationResult["settings"]["edition"];
  headlineLines: [string, string, string, string];
  stands: Array<{
    id: string;
    quarter: number;
    number: number;
    areaHa: number;
    formula: string | null;
    dominantSpecies: string | null;
    eligibility: CalculationResult["stands"][number]["verdict"]["status"];
    trace: string;
    included: boolean;
    flags: string[];
    volumeM3: number | null;
  }>;
  totals: {
    volumeM3: number;
    volumeWithoutFlaggedM3: number;
  };
  speciesVolumesM3: Record<string, number>;
  matrixColumnVolumesM3: CalculationResult["matrixColumnVolumes"];
  assortments: CalculationResult["assortments"];
  finance: CalculationResult["finance"];
  alternativeWithoutFlagged: CalculationResult["alternativeWithoutFlagged"];
  warnings: CalculationResult["warnings"];
}

/** A deterministic export: deliberately excludes timestamps and environment data. */
export function createJsonReport(
  inventory: Inventory,
  calculation: CalculationResult,
): ForestJsonReport {
  return {
    version: 1,
    property: { ...inventory.property },
    edition: calculation.settings.edition,
    headlineLines: createHeadlineLines(inventory, calculation),
    stands: calculation.stands.map((entry) => ({
      id: entry.id,
      quarter: entry.quarterNumber,
      number: entry.stand.number,
      areaHa: entry.stand.areaHa,
      formula: entry.stand.formulaRaw,
      dominantSpecies: entry.verdict.dominantSpecies,
      eligibility: entry.verdict.status,
      trace: entry.verdict.trace,
      included: entry.included,
      flags: [...entry.stand.flags],
      volumeM3: entry.volumeM3,
    })),
    totals: {
      volumeM3: calculation.totalVolumeM3,
      volumeWithoutFlaggedM3: calculation.alternativeWithoutFlagged.totalVolumeM3,
    },
    speciesVolumesM3: { ...calculation.speciesVolumes },
    matrixColumnVolumesM3: { ...calculation.matrixColumnVolumes },
    assortments: calculation.assortments,
    finance: calculation.finance,
    alternativeWithoutFlagged: calculation.alternativeWithoutFlagged,
    warnings: calculation.warnings,
  };
}

export function serializeJsonReport(
  inventory: Inventory,
  calculation: CalculationResult,
  indentation = 2,
): string {
  return JSON.stringify(createJsonReport(inventory, calculation), null, indentation);
}

export const renderJsonReport = createJsonReport;
