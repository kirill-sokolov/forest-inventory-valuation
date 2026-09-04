import { MATRIX_COLUMNS, type MatrixColumn } from "../species";
import type { MatrixColumnVolumes } from "./species-split";

export interface AssortmentCell {
  sharePercent: number | null;
  priceEurM3: number | null;
}

export interface AssortmentRow {
  name: string;
  label: string;
  cells: Partial<Record<MatrixColumn, AssortmentCell>>;
}

export interface AssortmentMatrix {
  rows: AssortmentRow[];
}

export interface AssortmentRevenueRow {
  name: string;
  label: string;
  revenueEur: number;
  revenueByColumnEur: Record<MatrixColumn, number>;
}

export interface AssortmentCalculation {
  rows: AssortmentRevenueRow[];
  revenueByColumnEur: Record<MatrixColumn, number>;
  totalRevenueEur: number;
  columnShareSums: Record<MatrixColumn, number>;
  unallocatedM3: Record<MatrixColumn, number>;
  unpricedM3: Record<MatrixColumn, number>;
  inputIssues: AssortmentInputIssue[];
}

export interface AssortmentInputIssue {
  code: "missing-price" | "invalid-value";
  assortment: string;
  label: string;
  column: MatrixColumn;
  field: "sharePercent" | "priceEurM3";
  received: string | null;
  sharePercent: number;
  affectedVolumeM3: number;
}

interface EffectiveCell {
  sharePercent: number;
  priceEurM3: number;
  hasUsablePrice: boolean;
}

function cell(sharePercent: number | null, priceEurM3: number | null): AssortmentCell {
  return { sharePercent, priceEurM3 };
}

/** Employer matrix from docs/spec.md. The Oz/Os 70% sum is intentional and must warn. */
export function createDefaultAssortmentMatrix(): AssortmentMatrix {
  return {
    rows: [
      { name: "A klase", label: "A klase", cells: { P: cell(3, 120) } },
      { name: "Finieris A", label: "Finieris A", cells: { B: cell(5, 150) } },
      { name: "Finieris B", label: "Finieris B", cells: { B: cell(15, 110) } },
      { name: "Finieris C", label: "Finieris C", cells: { B: cell(10, 90) } },
      {
        name: "ZB",
        label: "ZB (zāģbaļķi)",
        cells: {
          P: cell(70, 100),
          E: cell(50, 100),
          Ma: cell(30, 80),
          A: cell(20, 80),
          "Oz/Os": cell(10, 200),
        },
      },
      { name: "SB", label: "SB (sīkbaļķi)", cells: { P: cell(7, 80), E: cell(15, 80) } },
      {
        name: "Tara",
        label: "Tara",
        cells: {
          P: cell(10, 60),
          E: cell(10, 60),
          B: cell(30, 50),
          Ma: cell(40, 50),
          A: cell(50, 50),
          Ba: cell(20, 50),
          "Oz/Os": cell(60, 60),
        },
      },
      {
        name: "PM",
        label: "PM (papīrmalka)",
        cells: { P: cell(7, 50), E: cell(20, 50), B: cell(30, 40), A: cell(20, 45) },
      },
      { name: "Kamīnmalka", label: "Kamīnmalka", cells: { "Oz/Os": cell(null, 50) } },
      {
        name: "Malka",
        label: "Malka",
        cells: {
          P: cell(3, 38),
          E: cell(5, 38),
          B: cell(10, 38),
          Ma: cell(30, 38),
          A: cell(10, 38),
          Ba: cell(80, 38),
          Citi: cell(100, 38),
        },
      },
      { name: "Gulsnis", label: "Gulsnis", cells: { P: cell(null, 70) } },
    ],
  };
}

export const DEFAULT_ASSORTMENT_MATRIX = createDefaultAssortmentMatrix();

export function cloneAssortmentMatrix(matrix: AssortmentMatrix): AssortmentMatrix {
  return {
    rows: matrix.rows.map((row) => ({
      ...row,
      cells: Object.fromEntries(
        Object.entries(row.cells).map(([column, value]) => [column, value ? { ...value } : value]),
      ),
    })),
  };
}

export function setAssortmentCell(
  matrix: AssortmentMatrix,
  rowName: string,
  column: MatrixColumn,
  patch: Partial<AssortmentCell>,
): AssortmentMatrix {
  const copy = cloneAssortmentMatrix(matrix);
  const row = copy.rows.find((candidate) => candidate.name === rowName);
  if (!row) throw new Error(`Nezināms sortiments: ${rowName}`);
  row.cells[column] = {
    sharePercent: null,
    priceEurM3: null,
    ...row.cells[column],
    ...patch,
  };
  return copy;
}

export function calculateAssortments(
  volumes: MatrixColumnVolumes,
  matrix: AssortmentMatrix,
): AssortmentCalculation {
  const revenueByColumnEur = zeroByColumn();
  const columnShareSums = zeroByColumn();
  const inputIssues: AssortmentInputIssue[] = [];
  const effectiveRows = matrix.rows.map((row) => ({
    row,
    cells: Object.fromEntries(
      MATRIX_COLUMNS.map((column) => {
        const effective = normalizeCell(row, column, volumes[column], inputIssues);
        columnShareSums[column] += effective.sharePercent;
        return [column, effective];
      }),
    ) as Record<MatrixColumn, EffectiveCell>,
  }));

  const rows = effectiveRows.map(({ row, cells }): AssortmentRevenueRow => {
    const rowRevenue = zeroByColumn();
    for (const column of MATRIX_COLUMNS) {
      const currentCell = cells[column];
      const share = currentCell.sharePercent / 100;
      const price = currentCell.priceEurM3;
      rowRevenue[column] = volumes[column] * share * price;
      revenueByColumnEur[column] += rowRevenue[column];
    }
    return {
      name: row.name,
      label: row.label,
      revenueEur: sumColumns(rowRevenue),
      revenueByColumnEur: rowRevenue,
    };
  });
  const unallocatedM3 = zeroByColumn();
  const unpricedM3 = zeroByColumn();
  for (const column of MATRIX_COLUMNS) {
    unallocatedM3[column] = (volumes[column] * Math.max(0, 100 - columnShareSums[column])) / 100;
    const withoutPrice = effectiveRows.reduce((sum, { cells }) => {
      const currentCell = cells[column];
      return currentCell.sharePercent > 0 && !currentCell.hasUsablePrice
        ? sum + (volumes[column] * currentCell.sharePercent) / 100
        : sum;
    }, 0);
    unpricedM3[column] = unallocatedM3[column] + withoutPrice;
  }
  return {
    rows,
    revenueByColumnEur,
    totalRevenueEur: sumColumns(revenueByColumnEur),
    columnShareSums,
    unallocatedM3,
    unpricedM3,
    inputIssues,
  };
}

export function matrixColumnAnchor(column: MatrixColumn): string {
  return `matrix-${domToken(column)}`;
}

export function matrixCellAnchor(assortment: string, column: MatrixColumn): string {
  return `matrix-${domToken(assortment)}-${domToken(column)}`;
}

function normalizeCell(
  row: AssortmentRow,
  column: MatrixColumn,
  columnVolumeM3: number,
  issues: AssortmentInputIssue[],
): EffectiveCell {
  const source = row.cells[column];
  const rawShare = source?.sharePercent ?? 0;
  const shareIsValid = Number.isFinite(rawShare) && rawShare >= 0;
  const sharePercent = shareIsValid ? rawShare : 0;
  if (!shareIsValid) {
    issues.push({
      code: "invalid-value",
      assortment: row.name,
      label: row.label,
      column,
      field: "sharePercent",
      received: String(rawShare),
      sharePercent: 0,
      affectedVolumeM3: 0,
    });
  }

  const rawPrice = source?.priceEurM3;
  const priceIsMissing = rawPrice === null || rawPrice === undefined;
  const priceIsValid = !priceIsMissing && Number.isFinite(rawPrice) && rawPrice >= 0;
  const priceEurM3 = priceIsValid ? rawPrice : 0;
  const affectedVolumeM3 = (columnVolumeM3 * sharePercent) / 100;
  if (sharePercent > 0 && priceIsMissing) {
    issues.push({
      code: "missing-price",
      assortment: row.name,
      label: row.label,
      column,
      field: "priceEurM3",
      received: null,
      sharePercent,
      affectedVolumeM3,
    });
  } else if (!priceIsMissing && !priceIsValid) {
    issues.push({
      code: "invalid-value",
      assortment: row.name,
      label: row.label,
      column,
      field: "priceEurM3",
      received: String(rawPrice),
      sharePercent,
      affectedVolumeM3,
    });
  }

  return { sharePercent, priceEurM3, hasUsablePrice: priceIsValid };
}

function zeroByColumn(): Record<MatrixColumn, number> {
  return Object.fromEntries(MATRIX_COLUMNS.map((column) => [column, 0])) as Record<
    MatrixColumn,
    number
  >;
}

function sumColumns(values: Record<MatrixColumn, number>): number {
  return MATRIX_COLUMNS.reduce((sum, column) => sum + values[column], 0);
}

function domToken(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("lv")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
}
