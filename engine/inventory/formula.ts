import { getSpeciesDefinition, type MatrixColumn, matrixColumnForSpecies } from "../species";

export type FormulaWarning = CoefficientSumWarning | UnknownSpeciesWarning | InvalidFormulaWarning;

export interface CoefficientSumWarning {
  code: "coefficient-sum";
  coefficientSum: number;
  message: string;
}

export interface UnknownSpeciesWarning {
  code: "unknown-species";
  speciesCode: string;
  message: string;
}

export interface InvalidFormulaWarning {
  code: "invalid-formula";
  fragment: string;
  message: string;
}

export interface FormulaEntry {
  code: string;
  coefficientTenths: number;
  admixture: boolean;
}

export interface FormulaGroup {
  raw: string;
  entries: FormulaEntry[];
  ageYears: number | null;
}

export interface FormulaSpeciesShare {
  code: string;
  coefficientTenths: number;
  share: number;
  agesYears: number[];
  admixture: boolean;
  known: boolean;
  matrixColumn: MatrixColumn;
}

export interface ParsedCompositionFormula {
  raw: string | null;
  groups: FormulaGroup[];
  species: FormulaSpeciesShare[];
  sharesTenths: Record<string, number>;
  coefficientSum: number;
  dominantSpecies: string | null;
  admixtures: string[];
  warnings: FormulaWarning[];
}

interface MutableSpeciesShare {
  code: string;
  coefficientTenths: number;
  agesYears: number[];
  admixture: boolean;
}

/** Parse the composition grammar documented in docs/spec.md §Composition formula. */
export function parseCompositionFormula(raw: string | null | undefined): ParsedCompositionFormula {
  const normalized = raw?.normalize("NFC").trim().replace(/\s+/g, " ") ?? "";
  if (!normalized) {
    return {
      raw: raw ?? null,
      groups: [],
      species: [],
      sharesTenths: {},
      coefficientSum: 0,
      dominantSpecies: null,
      admixtures: [],
      warnings: [],
    };
  }

  const invalidFragments: string[] = [];
  const groups = normalized.split(" ").map((group) => parseGroup(group, invalidFragments));
  const speciesByCode = new Map<string, MutableSpeciesShare>();
  const admixtures: string[] = [];

  for (const group of groups) {
    for (const entry of group.entries) {
      let species = speciesByCode.get(entry.code);
      if (!species) {
        species = {
          code: entry.code,
          coefficientTenths: 0,
          agesYears: [],
          admixture: entry.admixture,
        };
        speciesByCode.set(entry.code, species);
      }
      if (entry.admixture) {
        if (!admixtures.includes(entry.code)) admixtures.push(entry.code);
      } else {
        species.coefficientTenths += entry.coefficientTenths;
        species.admixture = false;
        if (group.ageYears !== null && !species.agesYears.includes(group.ageYears)) {
          species.agesYears.push(group.ageYears);
        }
      }
    }
  }

  const coefficientSum = [...speciesByCode.values()].reduce(
    (sum, species) => sum + species.coefficientTenths,
    0,
  );
  const species: FormulaSpeciesShare[] = [...speciesByCode.values()].map((entry) => ({
    ...entry,
    share: entry.coefficientTenths / 10,
    known: getSpeciesDefinition(entry.code) !== undefined,
    matrixColumn: matrixColumnForSpecies(entry.code),
  }));
  const warnings: FormulaWarning[] = [];
  if (coefficientSum !== 10) {
    warnings.push({
      code: "coefficient-sum",
      coefficientSum,
      message: `Formulas koeficientu summa ir ${coefficientSum}, nevis 10.`,
    });
  }
  for (const entry of species) {
    if (!entry.known) {
      warnings.push({
        code: "unknown-species",
        speciesCode: entry.code,
        message: `Nezināms sugas kods “${entry.code}”; apjoms pieskaitīts kolonnai “Citi”.`,
      });
    }
  }
  for (const fragment of invalidFragments) {
    warnings.push({
      code: "invalid-formula",
      fragment,
      message: `Neizdevās pilnībā nolasīt formulas daļu “${fragment}”.`,
    });
  }

  let dominantSpecies: string | null = null;
  let largestCoefficient = -1;
  for (const entry of species) {
    if (!entry.admixture && entry.coefficientTenths > largestCoefficient) {
      largestCoefficient = entry.coefficientTenths;
      dominantSpecies = entry.code;
    }
  }

  return {
    raw: normalized,
    groups,
    species,
    sharesTenths: Object.fromEntries(
      species
        .filter((entry) => !entry.admixture && entry.coefficientTenths > 0)
        .map((entry) => [entry.code, entry.coefficientTenths]),
    ),
    coefficientSum,
    dominantSpecies,
    admixtures,
    warnings,
  };
}

/** Short alias convenient for engine consumers. */
export const parseFormula = parseCompositionFormula;

function parseGroup(raw: string, invalidFragments: string[]): FormulaGroup {
  const entries: FormulaEntry[] = [];
  let ageYears: number | null = null;
  let remaining = raw;

  while (remaining.length > 0) {
    if (remaining.startsWith("+")) {
      const speciesMatch = remaining.slice(1).match(/^\p{L}+/u);
      if (!speciesMatch) {
        invalidFragments.push(remaining);
        break;
      }
      entries.push({ code: speciesMatch[0], coefficientTenths: 0, admixture: true });
      remaining = remaining.slice(1 + speciesMatch[0].length);
      continue;
    }

    const ageMatch = remaining.match(/^\d+$/);
    if (ageMatch) {
      ageYears = Number(ageMatch[0]);
      remaining = "";
      continue;
    }

    const coefficientMatch = remaining.match(/^(10|[1-9])(?=\p{L})/u);
    if (!coefficientMatch) {
      invalidFragments.push(remaining);
      break;
    }
    remaining = remaining.slice(coefficientMatch[0].length);
    const speciesMatch = remaining.match(/^\p{L}+/u);
    if (!speciesMatch) {
      invalidFragments.push(remaining);
      break;
    }
    entries.push({
      code: speciesMatch[0],
      coefficientTenths: Number(coefficientMatch[0]),
      admixture: false,
    });
    remaining = remaining.slice(speciesMatch[0].length);
  }

  return { raw, entries, ageYears };
}
