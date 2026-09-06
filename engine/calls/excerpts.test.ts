import { describe, expect, it } from "vitest";
import { createCallExcerpts, resolveCallExcerpt } from "./excerpts";

describe("verbatim call evidence selection", () => {
  it("keeps full source turns and never invents a prefix for a mid-turn fragment", () => {
    const transcript =
      "Darbinieks: Labdien! Te Anna. Jūs vakar atstājāt pieteikumu.\nKlients: Jā.\nCits: Tēti!";
    const excerpts = createCallExcerpts(transcript);
    expect(resolveCallExcerpt(excerpts, 1)).toBe(
      "Darbinieks: Labdien! Te Anna. Jūs vakar atstājāt pieteikumu.",
    );
    expect(resolveCallExcerpt(excerpts, 3)).toBe("Cits: Tēti!");
    expect(() => resolveCallExcerpt(excerpts, 99)).toThrow();
    expect(resolveCallExcerpt(excerpts, null)).toBeNull();
  });

  it("splits long turns into bounded contiguous excerpts without changing their words", () => {
    const transcript = `Darbinieks: ${"Dokumenti vēl jāpārbauda. ".repeat(50)}\nKlients: Pagaidiet... 4,2, nē, 4,7 hektāri.`;
    const excerpts = createCallExcerpts(transcript);
    expect(excerpts.length).toBeGreaterThan(2);
    for (const excerpt of excerpts) {
      expect(excerpt.text.length).toBeLessThanOrEqual(500);
      expect(transcript).toContain(excerpt.text);
    }
    expect(excerpts.at(-1)?.text).toBe("Klients: Pagaidiet... 4,2, nē, 4,7 hektāri.");
  });
});
