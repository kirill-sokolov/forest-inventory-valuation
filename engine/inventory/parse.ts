import type { ExtractedPdfText, PdfTextLine } from "../pdf/extract-text.shared";
import { normalizePdfText, parseLatvianNumber } from "../pdf/normalize";
import type {
  AreaBreakdown,
  Inventory,
  InventoryProperty,
  InventoryTotals,
  Quarter,
  Stand,
  StandNotes,
} from "./types";

export type InventoryParseInput =
  | string
  | ExtractedPdfText
  | readonly string[]
  | readonly PdfTextLine[];

interface StandBlock {
  number: number;
  areaHa: number;
  firstRemainder: string;
  continuationLines: string[];
}

interface ForestColumns {
  formulaRaw: string | null;
  origin: string | null;
  bonitate: string | null;
  heightM: number | null;
  diameterCm: number | null;
  ageYears: number | null;
  density: number | null;
  basalAreaM2Ha: number | null;
  treesPerHa: number | null;
  stockM3Ha: number | null;
}

const STAND_START = /^(\d{1,3})\s+(\d+(?:[,.]\d+)?)\s+(.+)$/u;
const QUARTER_LINE = /(?:^|\s)(\d{1,3})\.\s*kvartāls\b/iu;
const FORMULA_FRAGMENT =
  /^(?:\d{1,2}\p{L}{1,3})+(?:\d{1,3})?(?:\s+(?:\d{1,2}\p{L}{1,3})+(?:\d{1,3})?)*(?:\s*\+\p{L}{1,3})?$/u;
const NOTE_PREFIX = /^(?:Pēdējais|Atjaunots:|Aizs\.paz\.-|Platību sadalījums:)/u;

function inputLines(input: InventoryParseInput): string[] {
  if (typeof input === "string") {
    return input.split(/\r?\n/u).map(normalizePdfText).filter(Boolean);
  }

  const rawLines = "lines" in input ? input.lines : input;
  return rawLines
    .map((line) => (typeof line === "string" ? line : line.str))
    .map(normalizePdfText)
    .filter(Boolean);
}

function firstCapture(text: string, pattern: RegExp, field: string): string {
  const value = text.match(pattern)?.[1]?.trim();
  if (!value) {
    throw new Error(`Inventory is missing ${field}`);
  }
  return value;
}

function parseProperty(text: string): InventoryProperty {
  const landUnit = firstCapture(text, /Zemes vienības apzīmējums\s*[-:]\s*(\d{11})/iu, "land unit");
  const propertyMatch = text.match(
    /Īpašums\s*-\s*(\d{11})\s*-\s*([^\n]+?)(?=\s+Saimniecība:|\s{2,}|\n|$)/iu,
  );
  if (!propertyMatch?.[1] || !propertyMatch[2]) {
    throw new Error("Inventory is missing property details");
  }

  const parish = firstCapture(text, /(?:^|\n)([^\n]+?)\s+pagasts\b/imu, "parish");
  const farm = firstCapture(text, /Saimniecība:\s*([^\n]+?)(?=\s{2,}|\n|$)/iu, "farm");
  const inventoryYear = Number(
    firstCapture(text, /inv\.\s*veikta\s*(\d{4})\.\s*gadā/iu, "inventory year"),
  );
  const reportDateMatch = text.match(
    /(?:^|\n)\d{11}\s+(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})\s+lpp\b/iu,
  )?.[1];
  const reportDate = reportDateMatch?.includes("-")
    ? reportDateMatch.split("-").reverse().join(".")
    : reportDateMatch;

  return {
    landUnit,
    propertyCadastre: propertyMatch[1],
    propertyName: propertyMatch[2].trim(),
    parish,
    farm,
    inventoryYear,
    ...(reportDate ? { reportDate } : {}),
  };
}

function parseAreaBreakdown(text: string): AreaBreakdown | undefined {
  const match = text.match(
    /t\.sk\.\s*mežs\s*([\d.,]+)\s*ha.*?t\.sk\.\s*ceļi\s*([\d.,]+)\s*ha.*?t\.sk\.\s*grāvji\s*([\d.,]+)\s*ha/iu,
  );
  if (!match?.[1] || !match[2] || !match[3]) {
    return undefined;
  }
  return {
    forestHa: parseLatvianNumber(match[1]),
    roadsHa: parseLatvianNumber(match[2]),
    ditchesHa: parseLatvianNumber(match[3]),
  };
}

function parseTotals(lines: readonly string[]): InventoryTotals {
  const totalLine =
    [...lines].reverse().find((line) => /^Pavisam kopā\s*\(ha\):/iu.test(line)) ??
    [...lines].reverse().find((line) => /^Kopā platība kadastrā\s*\(ha\):/iu.test(line));
  if (!totalLine) {
    throw new Error("Inventory is missing total area");
  }
  const totalValue = totalLine.match(/\(ha\):\s*([\d.,]+)/u)?.[1];
  const fullBreakdown = parseAreaBreakdown(totalLine);
  const forestValue = totalLine.match(/t\.sk\.\s*mežs\s*([\d.,]+)\s*ha/iu)?.[1];
  if (!totalValue || (!fullBreakdown && !forestValue)) {
    throw new Error("Inventory total forest area is missing");
  }
  return {
    totalHa: parseLatvianNumber(totalValue),
    forestHa: fullBreakdown?.forestHa ?? parseLatvianNumber(forestValue ?? ""),
    roadsHa: fullBreakdown?.roadsHa ?? 0,
    ditchesHa: fullBreakdown?.ditchesHa ?? 0,
  };
}

function isFormulaFragment(line: string): boolean {
  return FORMULA_FRAGMENT.test(line.replace(/\s+/gu, " "));
}

function splitForestColumns(value: string): ForestColumns | undefined {
  const match = value.match(
    /^(?:(.*?)\s+)?([\p{Lu}]{1,3})\s+(Ia|III|II|IV|Va|V|I)\s+((?:\d+(?:[,.]\d+)?\s+){4,6}\d+(?:[,.]\d+)?)$/u,
  );
  if (!match?.[2] || !match[3] || !match[4]) {
    return undefined;
  }

  const values = match[4].split(/\s+/u).map(parseLatvianNumber);
  if (values.length < 5) {
    return undefined;
  }
  const [heightM, diameterCm, ageYears, density, ...standValues] = values;
  let basalAreaM2Ha: number | null = null;
  let treesPerHa: number | null = null;
  let stockM3Ha: number | null = null;

  if (standValues.length === 1) {
    [stockM3Ha] = standValues;
  } else if (standValues.length === 2) {
    const [basalOrTrees, stock] = standValues;
    stockM3Ha = stock ?? null;
    if ((basalOrTrees ?? 0) >= 100) {
      treesPerHa = basalOrTrees ?? null;
    } else {
      basalAreaM2Ha = basalOrTrees ?? null;
    }
  } else if (standValues.length >= 3) {
    [basalAreaM2Ha, treesPerHa, stockM3Ha] = standValues;
  }

  const formula = match[1]?.trim() ?? "";
  return {
    formulaRaw: formula.length > 0 ? formula : null,
    origin: match[2],
    bonitate: match[3],
    heightM: heightM ?? null,
    diameterCm: diameterCm ?? null,
    ageYears: ageYears ?? null,
    density: density ?? null,
    basalAreaM2Ha,
    treesPerHa,
    stockM3Ha,
  };
}

function parseNotes(lines: readonly string[]): StandNotes {
  const notes: StandNotes = {};
  const joined = lines.join("\n");
  const lastFelling = joined.match(/Pēdējais cirtes izpildes veids un gads:\s*([^\n]+)/iu)?.[1];
  const lastActivity = joined.match(/Pēdējais darbības veids un gads:\s*([^\n]+)/iu)?.[1];
  const restored = joined.match(/Atjaunots:\s*([^\n]+)/iu)?.[1];
  const protection = joined.match(/Aizs\.paz\.-\s*(\S+)\s+([^\n]+)/iu);
  const areaBreakdown = parseAreaBreakdown(joined.replace(/\n/gu, " "));

  if (lastFelling) notes.lastFelling = lastFelling.trim();
  if (lastActivity) notes.lastActivity = lastActivity.trim();
  if (restored) notes.restored = restored.trim();
  if (protection?.[1] && protection[2]) {
    notes.protection = {
      code: protection[1],
      text: protection[2].trim(),
    };
  }
  if (areaBreakdown) notes.areaBreakdown = areaBreakdown;

  return notes;
}

function parseForestStand(block: StandBlock, forestType: string, firstData: string): Stand {
  const dataLines = block.continuationLines.filter((line) => !NOTE_PREFIX.test(line));
  let columns = splitForestColumns(firstData);
  const formulaContinuations: string[] = [];

  if (columns) {
    formulaContinuations.push(...dataLines.filter(isFormulaFragment));
  } else {
    let candidate = firstData;
    for (const line of dataLines) {
      candidate = `${candidate} ${line}`;
      columns = splitForestColumns(candidate);
      if (columns) break;
    }
  }

  const resolved: ForestColumns = columns ?? {
    formulaRaw: null,
    origin: null,
    bonitate: null,
    heightM: null,
    diameterCm: null,
    ageYears: null,
    density: null,
    basalAreaM2Ha: null,
    treesPerHa: null,
    stockM3Ha: null,
  };
  const formulaRaw =
    [resolved.formulaRaw, ...formulaContinuations]
      .filter((part): part is string => Boolean(part))
      .join(" ") || null;
  const notes = parseNotes(block.continuationLines);

  return {
    number: block.number,
    areaHa: block.areaHa,
    landKind: "Mežaudze",
    forestType,
    formulaRaw,
    origin: resolved.origin,
    bonitate: resolved.bonitate,
    heightM: resolved.heightM,
    diameterCm: resolved.diameterCm,
    ageYears: resolved.ageYears,
    density: resolved.density,
    basalAreaM2Ha: resolved.basalAreaM2Ha,
    treesPerHa: resolved.treesPerHa,
    stockM3Ha: resolved.stockM3Ha,
    notes,
    flags: [
      ...(notes.protection ? (["protection-zone"] as const) : []),
      ...(!formulaRaw ? (["no-formula"] as const) : []),
    ],
  };
}

function parseNonForestStand(block: StandBlock): Stand {
  const kindParts = [
    block.firstRemainder,
    ...block.continuationLines.filter((line) => !NOTE_PREFIX.test(line)),
  ];
  return {
    number: block.number,
    areaHa: block.areaHa,
    landKind: normalizePdfText(kindParts.join(" ")),
    forestType: null,
    formulaRaw: null,
    origin: null,
    bonitate: null,
    heightM: null,
    diameterCm: null,
    ageYears: null,
    density: null,
    basalAreaM2Ha: null,
    treesPerHa: null,
    stockM3Ha: null,
    notes: parseNotes(block.continuationLines),
    flags: ["non-forest"],
  };
}

function parseStand(block: StandBlock): Stand {
  const forestMatch = block.firstRemainder.match(/^Mežaudze\s+(\S+)(?:\s+(.*))?$/u);
  if (!forestMatch?.[1]) {
    return parseNonForestStand(block);
  }
  return parseForestStand(block, forestMatch[1], forestMatch[2] ?? "");
}

/** Parse the VMD “Nogabalu raksturojošie rādītāji” text-layer format. */
export function parseInventory(input: InventoryParseInput): Inventory {
  const lines = inputLines(input);
  const text = lines.join("\n");
  const quarters: Quarter[] = [];
  let currentQuarter: Quarter | undefined;
  let currentBlock: StandBlock | undefined;

  const flushStand = () => {
    if (currentBlock && currentQuarter) {
      currentQuarter.stands.push(parseStand(currentBlock));
    }
    currentBlock = undefined;
  };

  for (const line of lines) {
    const quarterNumber = line.match(QUARTER_LINE)?.[1];
    if (quarterNumber) {
      flushStand();
      const number = Number(quarterNumber);
      currentQuarter = quarters.find((quarter) => quarter.number === number);
      if (!currentQuarter) {
        currentQuarter = { number, stands: [] };
        quarters.push(currentQuarter);
      }
      continue;
    }

    if (!currentQuarter) continue;
    if (/^(?:Kopā platība|Pavisam kopā)/iu.test(line)) {
      flushStand();
      continue;
    }

    const standMatch = line.match(STAND_START);
    if (standMatch?.[1] && standMatch[2] && standMatch[3]) {
      flushStand();
      currentBlock = {
        number: Number(standMatch[1]),
        areaHa: parseLatvianNumber(standMatch[2]),
        firstRemainder: standMatch[3],
        continuationLines: [],
      };
      continue;
    }

    currentBlock?.continuationLines.push(line);
  }
  flushStand();

  if (quarters.every(({ stands }) => stands.length === 0)) {
    throw new Error("Inventory contains no stand rows");
  }

  return {
    property: parseProperty(text),
    totals: parseTotals(lines),
    quarters,
  };
}

export const parseInventoryText = parseInventory;
