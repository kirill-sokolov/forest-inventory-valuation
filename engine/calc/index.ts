import type { ParsedCompositionFormula } from "../inventory/formula";
import type { Inventory, Stand } from "../inventory/types";
import {
  compareEligibilityEditions,
  type EligibilityVerdict,
  evaluateInventoryEligibility,
  type InventoryEligibilityResult,
  standId,
} from "../rules/eligibility";
import { DEFAULT_LAW_EDITION, type LawEdition } from "../rules/law-tables";
import type { MatrixColumn } from "../species";
import {
  type AssortmentCalculation,
  type AssortmentMatrix,
  calculateAssortments,
  cloneAssortmentMatrix,
  createDefaultAssortmentMatrix,
} from "./assortments";
import {
  type CostRatesPerM3,
  calculateFinance,
  DEFAULT_COST_RATES,
  DEFAULT_PROFIT_RATE,
  type FinanceResult,
} from "./finance";
import {
  aggregateMatrixColumnVolumes,
  aggregateSpeciesVolumes,
  type MatrixColumnVolumes,
  type SpeciesVolumes,
  type StandSpeciesVolume,
  splitVolumeBySpecies,
} from "./species-split";
import { calculateStandVolumeM3 } from "./volume";
import {
  type CalculationWarning,
  editionNoteWarning,
  formulaCalculationWarning,
  matrixColumnWarnings,
  matrixInputWarnings,
  protectionZoneWarning,
} from "./warnings";

export interface CalculationSettings {
  edition?: LawEdition;
  matrix?: AssortmentMatrix;
  costsPerM3?: Partial<CostRatesPerM3>;
  profitRate?: number;
  includeFlagged?: boolean;
  excludedStandIds?: readonly string[];
  excludedStandNumbers?: readonly number[];
}

export interface ResolvedCalculationSettings {
  edition: LawEdition;
  matrix: AssortmentMatrix;
  costsPerM3: CostRatesPerM3;
  profitRate: number;
  includeFlagged: boolean;
  excludedStandIds: readonly string[];
  excludedStandNumbers: readonly number[];
}

export interface CalculatedStand {
  id: string;
  quarterNumber: number;
  stand: Stand;
  verdict: EligibilityVerdict;
  formula: ParsedCompositionFormula;
  volumeM3: number | null;
  included: boolean;
}

export interface CalculationSummary {
  totalVolumeM3: number;
  speciesVolumes: SpeciesVolumes;
  matrixColumnVolumes: MatrixColumnVolumes;
  assortments: AssortmentCalculation;
  finance: FinanceResult;
}

export interface CalculationResult extends CalculationSummary {
  settings: ResolvedCalculationSettings;
  eligibility: InventoryEligibilityResult;
  stands: CalculatedStand[];
  includedStandNumbers: number[];
  volumeByStandId: Record<string, number>;
  alternativeWithoutFlagged: CalculationSummary;
  warnings: CalculationWarning[];
  editionFlips: number[];
}

/** Complete deterministic calculation pipeline for task 1. */
export function calculate(
  inventory: Inventory,
  settings: CalculationSettings = {},
): CalculationResult {
  const resolved = resolveSettings(settings);
  const eligibility = evaluateInventoryEligibility(inventory, resolved.edition);
  const excludedIds = new Set(resolved.excludedStandIds);
  const excludedNumbers = new Set(resolved.excludedStandNumbers);
  const stands: CalculatedStand[] = eligibility.verdicts.map((entry) => {
    const volumeM3 = entry.verdict.eligible ? calculateStandVolumeM3(entry.stand) : null;
    const explicitlyExcluded = excludedIds.has(entry.id) || excludedNumbers.has(entry.stand.number);
    const excludedAsFlagged =
      !resolved.includeFlagged && entry.stand.flags.includes("protection-zone");
    return {
      id: entry.id,
      quarterNumber: entry.quarterNumber,
      stand: entry.stand,
      verdict: entry.verdict,
      formula: entry.verdict.formula,
      volumeM3,
      included:
        entry.verdict.eligible && volumeM3 !== null && !explicitlyExcluded && !excludedAsFlagged,
    };
  });

  const summary = summarize(
    stands.filter((entry) => entry.included),
    resolved,
  );
  const alternativeWithoutFlagged = summarize(
    stands.filter((entry) => entry.included && !entry.stand.flags.includes("protection-zone")),
    resolved,
  );
  const comparison = compareEligibilityEditions(inventory);
  const standNumberCounts = new Map<number, number>();
  for (const entry of stands) {
    standNumberCounts.set(entry.stand.number, (standNumberCounts.get(entry.stand.number) ?? 0) + 1);
  }
  const duplicateStandNumbers = new Set(
    [...standNumberCounts.entries()]
      .filter(([, count]) => count > 1)
      .map(([standNumber]) => standNumber),
  );
  const warnings: CalculationWarning[] = [];
  for (const entry of stands) {
    if (entry.stand.flags.includes("protection-zone")) {
      warnings.push(
        protectionZoneWarning(
          entry.stand,
          entry.quarterNumber,
          alternativeWithoutFlagged.totalVolumeM3,
          duplicateStandNumbers.has(entry.stand.number),
        ),
      );
    }
  }
  for (const entry of stands) {
    for (const warning of entry.formula.warnings) {
      warnings.push(
        formulaCalculationWarning(
          warning,
          entry.stand.number,
          entry.quarterNumber,
          duplicateStandNumbers.has(entry.stand.number),
        ),
      );
    }
  }
  warnings.push(...matrixInputWarnings(summary.assortments.inputIssues));
  warnings.push(...matrixColumnWarnings(summary.assortments));
  warnings.push(editionNoteWarning(comparison, duplicateStandNumbers));

  return {
    ...summary,
    settings: resolved,
    eligibility,
    stands,
    includedStandNumbers: stands
      .filter((entry) => entry.included)
      .map((entry) => entry.stand.number),
    volumeByStandId: Object.fromEntries(
      stands
        .filter((entry) => entry.volumeM3 !== null)
        .map((entry) => [entry.id, entry.volumeM3 as number]),
    ),
    alternativeWithoutFlagged,
    warnings,
    editionFlips: comparison.standNumbers,
  };
}

export type { AssortmentCell, AssortmentMatrix, AssortmentRow } from "./assortments";
export {
  createDefaultAssortmentMatrix,
  matrixCellAnchor,
  matrixColumnAnchor,
  setAssortmentCell,
} from "./assortments";
export type { CostRatesPerM3, FinanceResult } from "./finance";
export { DEFAULT_COST_RATES, DEFAULT_PROFIT_RATE } from "./finance";
export type { CalculationWarning } from "./warnings";
export { standInputAnchor } from "./warnings";

function resolveSettings(settings: CalculationSettings): ResolvedCalculationSettings {
  const profitRate = settings.profitRate ?? DEFAULT_PROFIT_RATE;
  if (!Number.isFinite(profitRate) || profitRate < 0) {
    throw new RangeError("Peļņas likmei jābūt nenegatīvam skaitlim.");
  }
  const costsPerM3 = { ...DEFAULT_COST_RATES, ...settings.costsPerM3 };
  for (const value of Object.values(costsPerM3)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError("Izmaksu likmēm jābūt nenegatīviem skaitļiem.");
    }
  }
  return {
    edition: settings.edition ?? DEFAULT_LAW_EDITION,
    matrix: settings.matrix
      ? cloneAssortmentMatrix(settings.matrix)
      : createDefaultAssortmentMatrix(),
    costsPerM3,
    profitRate,
    includeFlagged: settings.includeFlagged ?? true,
    excludedStandIds: settings.excludedStandIds ?? [],
    excludedStandNumbers: settings.excludedStandNumbers ?? [],
  };
}

function summarize(
  includedStands: readonly CalculatedStand[],
  settings: ResolvedCalculationSettings,
): CalculationSummary {
  const parts: StandSpeciesVolume[] = [];
  let totalVolumeM3 = 0;
  for (const entry of includedStands) {
    const volumeM3 = entry.volumeM3 ?? 0;
    totalVolumeM3 += volumeM3;
    const split = splitVolumeBySpecies(volumeM3, entry.formula);
    for (const [speciesCode, speciesVolumeM3] of Object.entries(split)) {
      parts.push({ id: entry.id, speciesCode, volumeM3: speciesVolumeM3 });
    }
  }
  const speciesVolumes = aggregateSpeciesVolumes(parts);
  const matrixColumnVolumes = aggregateMatrixColumnVolumes(speciesVolumes);
  const assortments = calculateAssortments(matrixColumnVolumes, settings.matrix);
  const finance = calculateFinance(
    totalVolumeM3,
    assortments.totalRevenueEur,
    settings.costsPerM3,
    settings.profitRate,
  );
  return { totalVolumeM3, speciesVolumes, matrixColumnVolumes, assortments, finance };
}

/** Stable key helper for UI controls when stand numbers repeat between quarters. */
export function calculationStandId(quarterNumber: number, standNumber: number): string {
  return standId(quarterNumber, standNumber);
}

export function matrixVolume(result: CalculationResult, column: MatrixColumn): number {
  return result.matrixColumnVolumes[column];
}
