import {
  type FormulaWarning,
  type ParsedCompositionFormula,
  parseCompositionFormula,
} from "../inventory/formula";
import { allStands, type Inventory, type Stand, type StandFlag } from "../inventory/types";
import { getSpeciesDefinition } from "../species";
import {
  ageBonitateGroup,
  DEFAULT_LAW_EDITION,
  diameterBonitateGroup,
  diameterSpecies,
  type LawEdition,
  MAIN_FELLING_AGE,
  MAIN_FELLING_DIAMETER,
} from "./law-tables";

export type EligibilityStatus = "eligible" | "not-eligible" | "not-assessed";
export type EligibilityBasis = "age" | "diameter" | "exception" | null;

export interface EligibilityVerdict {
  status: EligibilityStatus;
  eligible: boolean;
  eligibleBy: EligibilityBasis;
  trace: string;
  edition: LawEdition;
  dominantSpecies: string | null;
  ageThresholdYears: number | null;
  diameterThresholdCm: number | null;
  flags: StandFlag[];
  warnings: FormulaWarning[];
  formula: ParsedCompositionFormula;
}

export interface InventoryEligibilityEntry {
  id: string;
  quarterNumber: number;
  stand: Stand;
  verdict: EligibilityVerdict;
}

export interface InventoryEligibilityResult {
  edition: LawEdition;
  verdicts: InventoryEligibilityEntry[];
  eligible: InventoryEligibilityEntry[];
  notEligible: InventoryEligibilityEntry[];
  notAssessed: InventoryEligibilityEntry[];
}

export interface EditionFlip {
  id: string;
  quarterNumber: number;
  standNumber: number;
  stand: Stand;
  current: EligibilityVerdict;
  taskEdition: EligibilityVerdict;
}

export interface EditionComparison {
  flips: EditionFlip[];
  standNumbers: number[];
}

/** Apply docs/spec.md §Clear-cut eligibility: age OR diameter, with the Ba exception. */
export function evaluateStandEligibility(
  stand: Stand,
  edition: LawEdition = DEFAULT_LAW_EDITION,
): EligibilityVerdict {
  const formula = parseCompositionFormula(stand.formulaRaw);
  const base = {
    edition,
    flags: [...stand.flags],
    warnings: formula.warnings,
    formula,
  };

  if (stand.flags.includes("non-forest")) {
    return notAssessed("Nav vērtēts: zemes veids nav mežaudze", base);
  }
  if (!stand.formulaRaw || formula.dominantSpecies === null) {
    return notAssessed("Nav vērtēts: nav sastāva formulas", base);
  }
  if (stand.stockM3Ha === null) {
    return notAssessed("Nav vērtēts: nav krājas datu", base);
  }

  const speciesCode = formula.dominantSpecies;
  if (speciesCode === "Ba") {
    return {
      ...base,
      status: "eligible",
      eligible: true,
      eligibleBy: "exception",
      trace: "Ba — bez vecuma/caurmēra ierobežojuma",
      dominantSpecies: speciesCode,
      ageThresholdYears: null,
      diameterThresholdCm: null,
    };
  }

  const species = getSpeciesDefinition(speciesCode);
  if (!species) {
    return {
      ...base,
      status: "not-eligible",
      eligible: false,
      eligibleBy: null,
      trace: `${speciesCode}: nezināms sugas kods; kailcirtes kritēriju nevar piemērot`,
      dominantSpecies: speciesCode,
      ageThresholdYears: null,
      diameterThresholdCm: null,
    };
  }

  const ageGroup = ageBonitateGroup(stand.bonitate);
  const ageThreshold =
    species.ageLawGroup && ageGroup ? MAIN_FELLING_AGE[species.ageLawGroup][ageGroup] : null;
  const diameterGroup = diameterBonitateGroup(stand.bonitate);
  const diameterCode = diameterSpecies(speciesCode);
  const diameterThreshold =
    diameterCode && diameterGroup
      ? (MAIN_FELLING_DIAMETER[edition][diameterCode][diameterGroup] ?? null)
      : null;
  const prefix = `${speciesCode}, ${stand.bonitate ?? "bonitāte nav norādīta"}:`;
  const formulaSuffix = coefficientWarningSuffix(formula.warnings);

  if (ageThreshold !== null && stand.ageYears !== null && stand.ageYears >= ageThreshold) {
    return {
      ...base,
      status: "eligible",
      eligible: true,
      eligibleBy: "age",
      trace: `${prefix} vecums ${stand.ageYears} ≥ ${ageThreshold}${formulaSuffix}`,
      dominantSpecies: speciesCode,
      ageThresholdYears: ageThreshold,
      diameterThresholdCm: diameterThreshold,
    };
  }
  if (
    diameterThreshold !== null &&
    stand.diameterCm !== null &&
    stand.diameterCm >= diameterThreshold
  ) {
    return {
      ...base,
      status: "eligible",
      eligible: true,
      eligibleBy: "diameter",
      trace: `${prefix} caurmērs ${stand.diameterCm} ≥ ${diameterThreshold}${formulaSuffix}`,
      dominantSpecies: speciesCode,
      ageThresholdYears: ageThreshold,
      diameterThresholdCm: diameterThreshold,
    };
  }

  const failures: string[] = [];
  if (ageThreshold !== null) {
    failures.push(
      stand.ageYears === null
        ? `vecums nav norādīts (nepieciešami ${ageThreshold})`
        : `vecums ${stand.ageYears} < ${ageThreshold}`,
    );
  }
  if (diameterThreshold !== null) {
    failures.push(
      stand.diameterCm === null
        ? `caurmērs nav norādīts (nepieciešami ${diameterThreshold})`
        : `caurmērs ${stand.diameterCm} < ${diameterThreshold}`,
    );
  }
  if (failures.length === 0) failures.push("sugai nav piemērojama vecuma vai caurmēra sliekšņa");

  return {
    ...base,
    status: "not-eligible",
    eligible: false,
    eligibleBy: null,
    trace: `${prefix} ${failures.join("; ")}${formulaSuffix}`,
    dominantSpecies: speciesCode,
    ageThresholdYears: ageThreshold,
    diameterThresholdCm: diameterThreshold,
  };
}

export function evaluateInventoryEligibility(
  inventory: Inventory,
  edition: LawEdition = DEFAULT_LAW_EDITION,
): InventoryEligibilityResult {
  const verdicts = inventory.quarters.flatMap((quarter) =>
    quarter.stands.map((stand) => ({
      id: standId(quarter.number, stand.number),
      quarterNumber: quarter.number,
      stand,
      verdict: evaluateStandEligibility(stand, edition),
    })),
  );
  return {
    edition,
    verdicts,
    eligible: verdicts.filter((entry) => entry.verdict.status === "eligible"),
    notEligible: verdicts.filter((entry) => entry.verdict.status === "not-eligible"),
    notAssessed: verdicts.filter((entry) => entry.verdict.status === "not-assessed"),
  };
}

export function compareEligibilityEditions(inventory: Inventory): EditionComparison {
  const current = evaluateInventoryEligibility(inventory, "current-2024");
  const taskEdition = evaluateInventoryEligibility(inventory, "task-pre-2022");
  const taskById = new Map(taskEdition.verdicts.map((entry) => [entry.id, entry]));
  const flips: EditionFlip[] = [];
  for (const currentEntry of current.verdicts) {
    const taskEntry = taskById.get(currentEntry.id);
    if (!taskEntry || currentEntry.verdict.eligible === taskEntry.verdict.eligible) continue;
    flips.push({
      id: currentEntry.id,
      quarterNumber: currentEntry.quarterNumber,
      standNumber: currentEntry.stand.number,
      stand: currentEntry.stand,
      current: currentEntry.verdict,
      taskEdition: taskEntry.verdict,
    });
  }
  return { flips, standNumbers: flips.map((flip) => flip.standNumber) };
}

export function standId(quarterNumber: number, standNumber: number): string {
  return `${quarterNumber}-${standNumber}`;
}

function coefficientWarningSuffix(warnings: FormulaWarning[]): string {
  const warning = warnings.find((candidate) => candidate.code === "coefficient-sum");
  return warning?.code === "coefficient-sum"
    ? ` (formulas koeficientu summa ${warning.coefficientSum}, ne 10)`
    : "";
}

function notAssessed(
  trace: string,
  base: {
    edition: LawEdition;
    flags: StandFlag[];
    warnings: FormulaWarning[];
    formula: ParsedCompositionFormula;
  },
): EligibilityVerdict {
  return {
    ...base,
    status: "not-assessed",
    eligible: false,
    eligibleBy: null,
    trace,
    dominantSpecies: base.formula.dominantSpecies,
    ageThresholdYears: null,
    diameterThresholdCm: null,
  };
}

/** Convenience for callers that already flattened an inventory. */
export function evaluateStands(
  inventory: Inventory,
  edition: LawEdition = DEFAULT_LAW_EDITION,
): EligibilityVerdict[] {
  return allStands(inventory).map((stand) => evaluateStandEligibility(stand, edition));
}
