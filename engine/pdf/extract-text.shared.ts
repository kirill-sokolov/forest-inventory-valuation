import { normalizePdfGlyphs, normalizePdfText } from "./normalize";

export interface PdfTextItem {
  page: number;
  x: number;
  y: number;
  str: string;
  width: number;
  height: number;
}

export interface PdfTextLine {
  page: number;
  y: number;
  str: string;
}

export interface ExtractedPdfText {
  pageCount: number;
  items: PdfTextItem[];
  lines: string[];
  positionedLines: PdfTextLine[];
  text: string;
}

const SAME_LINE_TOLERANCE = 1.5;

function joinItems(items: readonly PdfTextItem[]): string {
  const sorted = [...items].sort((left, right) => left.x - right.x);
  let joined = "";
  let previous: PdfTextItem | undefined;

  for (const item of sorted) {
    const value = normalizePdfGlyphs(item.str);
    if (value.length === 0) {
      continue;
    }

    if (
      previous &&
      !/\s$/u.test(joined) &&
      !/^\s/u.test(value) &&
      item.x - (previous.x + previous.width) >
        Math.max(1, Math.min(previous.height, item.height) * 0.2)
    ) {
      joined += " ";
    }

    joined += value;
    previous = item;
  }

  return normalizePdfText(joined);
}

/** Build stable reading-order lines from PDF-coordinate text items. */
export function assembleExtractedPdfText(
  rawItems: readonly PdfTextItem[],
  pageCount: number,
): ExtractedPdfText {
  const items = rawItems
    .filter((item) => normalizePdfText(item.str).length > 0)
    .map((item) => ({ ...item, str: normalizePdfGlyphs(item.str) }));
  const positionedLines: PdfTextLine[] = [];

  for (let page = 1; page <= pageCount; page += 1) {
    const pageItems = items
      .filter((item) => item.page === page)
      .sort((left, right) => right.y - left.y || left.x - right.x);
    const groups: PdfTextItem[][] = [];

    for (const item of pageItems) {
      const group = groups.find(
        (candidate) => Math.abs((candidate[0]?.y ?? item.y) - item.y) <= SAME_LINE_TOLERANCE,
      );
      if (group) {
        group.push(item);
      } else {
        groups.push([item]);
      }
    }

    for (const group of groups) {
      const str = joinItems(group);
      if (str.length > 0) {
        positionedLines.push({ page, y: group[0]?.y ?? 0, str });
      }
    }
  }

  const lines = positionedLines.map(({ str }) => str);

  return {
    pageCount,
    items,
    lines,
    positionedLines,
    text: lines.join("\n"),
  };
}
