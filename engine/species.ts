/** Columns used by the assortment matrix in docs/spec.md §Volume, species split, assortments, finance. */
export const MATRIX_COLUMNS = ["P", "E", "B", "Ma", "A", "Ba", "Oz/Os", "Citi"] as const;

export type MatrixColumn = (typeof MATRIX_COLUMNS)[number];

export type AgeLawGroup =
  | "oak"
  | "pine-larch"
  | "spruce-hardwood"
  | "birch"
  | "black-alder"
  | "aspen";

export interface SpeciesDefinition {
  code: string;
  nameLv: string;
  ageLawGroup: AgeLawGroup | null;
  matrixColumn: MatrixColumn;
  verified: boolean;
}

const definitions = [
  { code: "P", nameLv: "Priede", ageLawGroup: "pine-larch", matrixColumn: "P", verified: true },
  { code: "E", nameLv: "Egle", ageLawGroup: "spruce-hardwood", matrixColumn: "E", verified: true },
  { code: "B", nameLv: "Bērzs", ageLawGroup: "birch", matrixColumn: "B", verified: true },
  {
    code: "M",
    nameLv: "Melnalksnis",
    ageLawGroup: "black-alder",
    matrixColumn: "Ma",
    verified: true,
  },
  {
    code: "Ma",
    nameLv: "Melnalksnis",
    ageLawGroup: "black-alder",
    matrixColumn: "Ma",
    verified: true,
  },
  { code: "A", nameLv: "Apse", ageLawGroup: "aspen", matrixColumn: "A", verified: true },
  { code: "Ba", nameLv: "Baltalksnis", ageLawGroup: null, matrixColumn: "Ba", verified: true },
  { code: "Bl", nameLv: "Blīgzna", ageLawGroup: null, matrixColumn: "Citi", verified: true },
  {
    code: "Os",
    nameLv: "Osis",
    ageLawGroup: "spruce-hardwood",
    matrixColumn: "Oz/Os",
    verified: true,
  },
  { code: "Oz", nameLv: "Ozols", ageLawGroup: "oak", matrixColumn: "Oz/Os", verified: true },
  {
    code: "L",
    nameLv: "Lapegle",
    ageLawGroup: "pine-larch",
    matrixColumn: "Citi",
    verified: false,
  },
  {
    code: "Kļ",
    nameLv: "Kļava",
    ageLawGroup: "spruce-hardwood",
    matrixColumn: "Citi",
    verified: false,
  },
  {
    code: "K",
    nameLv: "Kļava",
    ageLawGroup: "spruce-hardwood",
    matrixColumn: "Citi",
    verified: false,
  },
  {
    code: "Li",
    nameLv: "Liepa",
    ageLawGroup: "spruce-hardwood",
    matrixColumn: "Citi",
    verified: false,
  },
  {
    code: "G",
    nameLv: "Goba",
    ageLawGroup: "spruce-hardwood",
    matrixColumn: "Citi",
    verified: false,
  },
  {
    code: "Vī",
    nameLv: "Vīksna",
    ageLawGroup: "spruce-hardwood",
    matrixColumn: "Citi",
    verified: false,
  },
  { code: "Ie", nameLv: "Ieva", ageLawGroup: null, matrixColumn: "Citi", verified: false },
] as const satisfies readonly SpeciesDefinition[];

export const SPECIES = definitions;

const speciesByCode = new Map<string, SpeciesDefinition>(
  definitions.map((definition) => [definition.code.normalize("NFC"), definition]),
);

/** Stable order for report totals; zero-volume species are omitted by the reporter. */
export const SPECIES_DISPLAY_ORDER = [
  "P",
  "E",
  "B",
  "M",
  "Ma",
  "A",
  "Ba",
  "Bl",
  "Oz",
  "Os",
  "L",
  "Kļ",
  "K",
  "Li",
  "G",
  "Vī",
  "Ie",
] as const;

export function getSpeciesDefinition(code: string): SpeciesDefinition | undefined {
  return speciesByCode.get(code.normalize("NFC"));
}

export function isKnownSpeciesCode(code: string): boolean {
  return getSpeciesDefinition(code) !== undefined;
}

export function matrixColumnForSpecies(code: string): MatrixColumn {
  return getSpeciesDefinition(code)?.matrixColumn ?? "Citi";
}
