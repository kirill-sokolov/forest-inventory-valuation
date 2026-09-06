import type { AgeLawGroup } from "../species";

export const LAW_EDITIONS = ["current-2024", "task-pre-2022"] as const;
export type LawEdition = (typeof LAW_EDITIONS)[number];
export const DEFAULT_LAW_EDITION: LawEdition = "current-2024";

export const LAW_EDITION_LABELS: Record<LawEdition, string> = {
  "current-2024": "Spēkā esošā (2026)",
  "task-pre-2022": "Uzdevuma (līdz 29.06.2022)",
};

export type AgeBonitateGroup = "I+" | "II-III" | "IV-";
export type DiameterBonitateGroup = "Ia" | "I" | "II" | "III" | "IV-V";

/**
 * Main-felling ages from Meža likums 9. pants.
 * Source: https://likumi.lv/ta/id/2825-meza-likums
 * See docs/spec.md §Clear-cut eligibility; Ba is handled as the assignment exception.
 */
export const MAIN_FELLING_AGE: Record<AgeLawGroup, Record<AgeBonitateGroup, number>> = {
  oak: { "I+": 101, "II-III": 121, "IV-": 121 },
  "pine-larch": { "I+": 101, "II-III": 101, "IV-": 121 },
  "spruce-hardwood": { "I+": 81, "II-III": 81, "IV-": 81 },
  birch: { "I+": 71, "II-III": 71, "IV-": 51 },
  "black-alder": { "I+": 71, "II-III": 71, "IV-": 71 },
  aspen: { "I+": 41, "II-III": 41, "IV-": 41 },
};

type DiameterSpecies = "P" | "E" | "B";
type DiameterThresholds = Partial<Record<DiameterBonitateGroup, number>>;

/**
 * Mean-diameter thresholds from MK noteikumi Nr. 935, 7. pielikums.
 * Source: https://likumi.lv/ta/id/253760-noteikumi-par-koku-cirsanu-meza
 * All 15 current values checked on 2026-09-06 against Annex 7 as reissued by MK No. 494
 * (effective 2026-08-21). The legacy current-2024 key is retained; see docs/waiting.md.
 * Editions and the Constitutional Court context are documented in docs/spec.md.
 */
export const MAIN_FELLING_DIAMETER: Record<
  LawEdition,
  Record<DiameterSpecies, DiameterThresholds>
> = {
  "task-pre-2022": {
    P: { Ia: 39, I: 35, II: 31, III: 27 },
    E: { Ia: 31, I: 29, II: 29, III: 27 },
    B: { Ia: 31, I: 27, II: 25, III: 22 },
  },
  "current-2024": {
    P: { Ia: 39, I: 35, II: 31, III: 30, "IV-V": 30 },
    E: { Ia: 31, I: 29, II: 29, III: 27, "IV-V": 26 },
    B: { Ia: 31, I: 27, II: 25, III: 25, "IV-V": 25 },
  },
};

export function ageBonitateGroup(bonitate: string | null): AgeBonitateGroup | null {
  switch (normalizeBonitate(bonitate)) {
    case "IA":
    case "I":
      return "I+";
    case "II":
    case "III":
      return "II-III";
    case "IV":
    case "V":
    case "VA":
      return "IV-";
    default:
      return null;
  }
}

export function diameterBonitateGroup(bonitate: string | null): DiameterBonitateGroup | null {
  switch (normalizeBonitate(bonitate)) {
    case "IA":
      return "Ia";
    case "I":
      return "I";
    case "II":
      return "II";
    case "III":
      return "III";
    case "IV":
    case "V":
    case "VA":
      return "IV-V";
    default:
      return null;
  }
}

export function diameterSpecies(code: string): DiameterSpecies | null {
  return code === "P" || code === "E" || code === "B" ? code : null;
}

function normalizeBonitate(bonitate: string | null): string {
  return bonitate?.normalize("NFC").trim().toLocaleUpperCase("lv") ?? "";
}
