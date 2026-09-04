import { describe, expect, it } from "vitest";
import {
  collapseWhitespace,
  normalizeDecimalComma,
  normalizePdfText,
  parseLatvianNumber,
} from "./normalize";

describe("PDF text normalization", () => {
  it("normalizes the registry's private ti glyph and compatibility ligatures", () => {
    expect(normalizePdfText("daƟ ﬁrma ﬂote ﬀ ﬃ ﬄ")).toBe("dati firma flote ff ffi ffl");
  });

  it("collapses Unicode whitespace", () => {
    expect(collapseWhitespace("  Nogabalu\u00a0\n  rādītāji  ")).toBe("Nogabalu rādītāji");
  });

  it("normalizes and parses Latvian decimal commas", () => {
    expect(normalizeDecimalComma("1,54")).toBe("1.54");
    expect(parseLatvianNumber("1,54")).toBe(1.54);
    expect(parseLatvianNumber(" 1 038,94 ")).toBe(1038.94);
  });
});
