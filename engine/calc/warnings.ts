import type { FormulaWarning } from "../inventory/formula";
import type { Stand } from "../inventory/types";
import type { EditionComparison } from "../rules/eligibility";
import type { MatrixColumn } from "../species";
import {
  type AssortmentCalculation,
  type AssortmentInputIssue,
  matrixCellAnchor,
  matrixColumnAnchor,
} from "./assortments";

interface WarningBase {
  severity: "warning";
  message: string;
  anchor: string;
}

export interface ProtectionZoneWarning extends WarningBase {
  code: "protection-zone";
  stand: number;
  quarter: number;
  alternativeTotalM3: number;
}

export interface CoefficientSumCalculationWarning extends WarningBase {
  code: "coefficient-sum";
  stand: number;
  quarter: number;
  sum: number;
}

export interface UnknownSpeciesCalculationWarning extends WarningBase {
  code: "unknown-species";
  stand: number;
  quarter: number;
  speciesCode: string;
}

export interface InvalidFormulaCalculationWarning extends WarningBase {
  code: "invalid-formula";
  stand: number;
  quarter: number;
  fragment: string;
}

export interface MatrixColumnSumWarning extends WarningBase {
  code: "matrix-column-sum";
  column: MatrixColumn;
  sumPercent: number;
  unpricedM3: number;
  hint: string | null;
}

export interface MatrixMissingPriceWarning extends WarningBase {
  code: "matrix-missing-price";
  assortment: string;
  column: MatrixColumn;
  sharePercent: number;
  affectedVolumeM3: number;
}

export interface MatrixInvalidValueWarning extends WarningBase {
  code: "matrix-invalid-value";
  assortment: string;
  column: MatrixColumn;
  field: "sharePercent" | "priceEurM3";
  received: string;
  affectedVolumeM3: number;
}

export interface EditionNoteWarning extends WarningBase {
  code: "edition-note";
  flips: number[];
}

export type CalculationWarning =
  | ProtectionZoneWarning
  | CoefficientSumCalculationWarning
  | UnknownSpeciesCalculationWarning
  | InvalidFormulaCalculationWarning
  | MatrixMissingPriceWarning
  | MatrixInvalidValueWarning
  | MatrixColumnSumWarning
  | EditionNoteWarning;

export function protectionZoneWarning(
  stand: Stand,
  quarter: number,
  alternativeTotalM3: number,
  disambiguate = false,
): ProtectionZoneWarning {
  const detail = stand.notes.protection
    ? `${stand.notes.protection.code} ${stand.notes.protection.text}`
    : "aizsardzības pazīme";
  return {
    code: "protection-zone",
    severity: "warning",
    stand: stand.number,
    quarter,
    alternativeTotalM3,
    anchor: standInputAnchor(quarter, stand.number, "include", disambiguate),
    message: `${standReference(quarter, stand.number, disambiguate)} norādīta aizsardzības pazīme (${detail}); pārbaudiet ierobežojumus.`,
  };
}

export function formulaCalculationWarning(
  warning: FormulaWarning,
  stand: number,
  quarter: number,
  disambiguate = false,
):
  | CoefficientSumCalculationWarning
  | UnknownSpeciesCalculationWarning
  | InvalidFormulaCalculationWarning {
  const common = {
    severity: "warning" as const,
    stand,
    quarter,
    anchor: standInputAnchor(quarter, stand, "formula", disambiguate),
    message: disambiguate
      ? `${standReference(quarter, stand, true)} ${warning.message.toLocaleLowerCase("lv")}`
      : warning.message,
  };
  switch (warning.code) {
    case "coefficient-sum":
      return { ...common, code: warning.code, sum: warning.coefficientSum };
    case "unknown-species":
      return { ...common, code: warning.code, speciesCode: warning.speciesCode };
    case "invalid-formula":
      return { ...common, code: warning.code, fragment: warning.fragment };
  }
}

export function matrixInputWarnings(
  issues: readonly AssortmentInputIssue[],
): Array<MatrixMissingPriceWarning | MatrixInvalidValueWarning> {
  return issues.map((issue) => {
    const common = {
      severity: "warning" as const,
      assortment: issue.assortment,
      column: issue.column,
      affectedVolumeM3: issue.affectedVolumeM3,
      anchor: matrixCellAnchor(issue.assortment, issue.column),
    };
    if (issue.code === "missing-price") {
      return {
        ...common,
        code: "matrix-missing-price" as const,
        sharePercent: issue.sharePercent,
        message: `${issue.label}, ${issue.column}: ${formatNumber(issue.sharePercent)} % īpatsvaram nav norādīta cena; ${formatNumber(issue.affectedVolumeM3)} m³ novērtēti ar 0 EUR.`,
      };
    }
    const fieldLabel = issue.field === "sharePercent" ? "īpatsvars" : "cena";
    return {
      ...common,
      code: "matrix-invalid-value" as const,
      field: issue.field,
      received: issue.received ?? "",
      message: `${issue.label}, ${issue.column}: nederīgs ${fieldLabel} “${issue.received ?? ""}”; aprēķinā izmantota nulles vērtība.`,
    };
  });
}

export function matrixColumnWarnings(calculation: AssortmentCalculation): MatrixColumnSumWarning[] {
  return (Object.entries(calculation.columnShareSums) as Array<[MatrixColumn, number]>).flatMap(
    ([column, sumPercent]) => {
      if (Math.abs(sumPercent - 100) < 1e-9) return [];
      const missingPercent = 100 - sumPercent;
      const hint = column === "Oz/Os" && missingPercent === 30 ? "Kamīnmalka" : null;
      const direction =
        missingPercent > 0
          ? `${formatNumber(missingPercent)} % nav sadalīti (${formatNumber(calculation.unpricedM3[column])} m³ nav novērtēti)`
          : `sadalījums pārsniedz 100 % par ${formatNumber(-missingPercent)} %`;
      return [
        {
          code: "matrix-column-sum" as const,
          severity: "warning" as const,
          column,
          sumPercent,
          unpricedM3: calculation.unpricedM3[column],
          hint,
          anchor: matrixColumnAnchor(column),
          message: `${column} kolonnas summa ir ${formatNumber(sumPercent)} %; ${direction}${
            hint ? `; iespējams, ${hint}` : ""
          }.`,
        },
      ];
    },
  );
}

export function editionNoteWarning(
  comparison: EditionComparison,
  duplicateStandNumbers: ReadonlySet<number> = new Set(),
): EditionNoteWarning {
  const flips = comparison.standNumbers;
  if (comparison.flips.length === 1) {
    const flip = comparison.flips[0];
    if (!flip.current.eligible && flip.taskEdition.eligible) {
      const oldThreshold = flip.taskEdition.diameterThresholdCm;
      const currentThreshold = flip.current.diameterThresholdCm;
      if (flip.stand.diameterCm !== null && oldThreshold !== null && currentThreshold !== null) {
        return {
          code: "edition-note",
          severity: "warning",
          flips,
          anchor: "law-edition",
          message: `Uzdevuma redakcijā (līdz 29.06.2022) ${standSubject(flip.quarterNumber, flip.standNumber, duplicateStandNumbers.has(flip.standNumber))} būtu cērtams (caurmērs ${flip.stand.diameterCm} ≥ ${oldThreshold}); spēkā esošajā — nē (nepieciešami ${currentThreshold} cm)`,
        };
      }
    }
  }
  return {
    code: "edition-note",
    severity: "warning",
    flips,
    anchor: "law-edition",
    message:
      flips.length === 0
        ? "Abās tabulas redakcijās kailcirtes atlases rezultāts ir vienāds."
        : `Mainot tabulas redakciju, kailcirtes statuss mainās nogabaliem: ${comparison.flips
            .map((flip) =>
              standReference(
                flip.quarterNumber,
                flip.standNumber,
                duplicateStandNumbers.has(flip.standNumber),
              ),
            )
            .join(", ")}.`,
  };
}

export function standInputAnchor(
  quarter: number,
  stand: number,
  field: "include" | "formula",
  disambiguate: boolean,
): string {
  return disambiguate ? `stand-${quarter}-${stand}-${field}` : `stand-${stand}-${field}`;
}

function standReference(quarter: number, stand: number, disambiguate: boolean): string {
  return disambiguate ? `${quarter}. kvartāla ${stand}. nogabalam` : `${stand}. nogabalam`;
}

function standSubject(quarter: number, stand: number, disambiguate: boolean): string {
  return disambiguate ? `${quarter}. kvartāla ${stand}. nogabals` : `${stand}. nogabals`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(".", ",");
}
