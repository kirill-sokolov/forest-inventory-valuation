import type { ParsedCompositionFormula } from "../inventory/formula";
import { MATRIX_COLUMNS, type MatrixColumn, matrixColumnForSpecies } from "../species";

export type SpeciesVolumes = Record<string, number>;
export type MatrixColumnVolumes = Record<MatrixColumn, number>;

export interface StandSpeciesVolume {
  id: string;
  speciesCode: string;
  volumeM3: number;
}

/** Uses formula tenths directly; a formula summing to nine deliberately allocates only 90%. */
export function splitVolumeBySpecies(
  volumeM3: number,
  formula: ParsedCompositionFormula,
): SpeciesVolumes {
  return Object.fromEntries(
    formula.species
      .filter((species) => species.coefficientTenths > 0)
      .map((species) => [species.code, volumeM3 * species.share]),
  );
}

export function aggregateSpeciesVolumes(parts: readonly StandSpeciesVolume[]): SpeciesVolumes {
  const totals: SpeciesVolumes = {};
  for (const part of parts) {
    totals[part.speciesCode] = (totals[part.speciesCode] ?? 0) + part.volumeM3;
  }
  return totals;
}

export function aggregateMatrixColumnVolumes(speciesVolumes: SpeciesVolumes): MatrixColumnVolumes {
  const totals = Object.fromEntries(
    MATRIX_COLUMNS.map((column) => [column, 0]),
  ) as MatrixColumnVolumes;
  for (const [speciesCode, volumeM3] of Object.entries(speciesVolumes)) {
    totals[matrixColumnForSpecies(speciesCode)] += volumeM3;
  }
  return totals;
}
