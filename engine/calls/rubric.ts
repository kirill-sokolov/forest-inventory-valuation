import type { CriterionId } from "./types";

export interface CallRubricCriterion {
  id: CriterionId;
  label: string;
  description: string;
  weight: number;
}

export interface CallRubric {
  version: string;
  label: string;
  criteria: readonly CallRubricCriterion[];
}

/** Versioned scoring table from docs/spec.md, “Task 3 — call quality and daily summaries”. */
export const PROCUREMENT_CALL_RUBRIC = {
  version: "procurement-v1",
  label: "Iepirkumu zvana kvalitāte",
  criteria: [
    {
      id: "greeting-identity",
      label: "Sveiciens un identificēšanās",
      description: "Darbinieks sasveicinās un skaidri identificē sevi vai komandu.",
      weight: 10,
    },
    {
      id: "purpose",
      label: "Zvana mērķis",
      description: "Klientam ir izskaidrots zvana iemesls.",
      weight: 10,
    },
    {
      id: "need-object",
      label: "Vajadzība vai objekts",
      description: "Ir noskaidrota klienta vajadzība, mērķis vai piedāvājuma objekts.",
      weight: 15,
    },
    {
      id: "key-parameters",
      label: "Galvenie parametri",
      description: "Ir savākti izvērtēšanai nepieciešamie galvenie parametri.",
      weight: 15,
    },
    {
      id: "price-terms",
      label: "Cena un nosacījumi",
      description: "Ir pārrunāta sagaidāmā cena un būtiskie darījuma nosacījumi.",
      weight: 15,
    },
    {
      id: "timing-decision",
      label: "Termiņš un lēmuma process",
      description: "Ir noskaidrots termiņš un lēmuma pieņēmēji.",
      weight: 10,
    },
    {
      id: "questions-objections",
      label: "Jautājumi un iebildumi",
      description: "Klients ir aicināts nosaukt jautājumus vai iebildumus, un tie ir apstrādāti.",
      weight: 10,
    },
    {
      id: "next-step",
      label: "Konkrēts nākamais solis",
      description: "Ir panākta skaidra vienošanās par turpmāko darbību.",
      weight: 10,
    },
    {
      id: "summary-close",
      label: "Kopsavilkums un pieklājīgs noslēgums",
      description: "Vienošanās ir apkopota un saruna pieklājīgi noslēgta.",
      weight: 5,
    },
  ],
} as const satisfies CallRubric;
