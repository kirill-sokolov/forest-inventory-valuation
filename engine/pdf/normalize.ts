const GLYPH_REPLACEMENTS: Readonly<Record<string, string>> = {
  Ɵ: "ti",
  ɵ: "ti",
  ﬁ: "fi",
  ﬂ: "fl",
  ﬀ: "ff",
  ﬃ: "ffi",
  ﬄ: "ffl",
};

const GLYPH_PATTERN = new RegExp(`[${Object.keys(GLYPH_REPLACEMENTS).join("")}]`, "gu");

/** Normalize glyph substitutions observed in VMD PDFs without changing line breaks. */
export function normalizePdfGlyphs(value: string): string {
  return value
    .normalize("NFKC")
    .replace(GLYPH_PATTERN, (glyph) => GLYPH_REPLACEMENTS[glyph] ?? glyph)
    .replace(/\u00ad/gu, "");
}

export function collapseWhitespace(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

export function normalizePdfText(value: string): string {
  return collapseWhitespace(normalizePdfGlyphs(value));
}

/** Convert a decimal comma to the JavaScript decimal separator. */
export function normalizeDecimalComma(value: string): string {
  return value
    .trim()
    .replace(/[\u00a0\s]/gu, "")
    .replace(",", ".");
}

export function parseLatvianNumber(value: string): number {
  const parsed = Number(normalizeDecimalComma(value));
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid Latvian number: ${value}`);
  }
  return parsed;
}
