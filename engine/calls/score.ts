import { PROCUREMENT_CALL_RUBRIC } from "./rubric";
import type {
  AnalyzedCall,
  AnalyzedCriterion,
  CallExtraction,
  CallFacts,
  CallObservation,
  CallRecord,
  CallScoreBand,
  CallWarning,
  CriterionId,
  ObservationStatus,
} from "./types";

const LOW_CONFIDENCE_THRESHOLD = 0.7;

const EMPTY_FACTS: CallFacts = {
  need: null,
  keyParameters: [],
  priceTerms: null,
  timing: null,
  nextAction: null,
};

/** Deterministic scoring rules from docs/spec.md, “Task 3 — call quality and daily summaries”. */
export function analyzeCall(record: CallRecord, extraction: CallExtraction | null): AnalyzedCall {
  if (record.disposition === "no-answer") {
    return {
      ...record,
      rubricVersion: PROCUREMENT_CALL_RUBRIC.version,
      criteria: [],
      facts: cloneFacts(EMPTY_FACTS),
      applicableWeight: 0,
      earnedWeight: 0,
      score: null,
      band: null,
      warnings: [],
      needsReview: false,
    };
  }

  const warnings: CallWarning[] = [];
  if (extraction && extraction.rubricVersion !== PROCUREMENT_CALL_RUBRIC.version) {
    warnings.push({
      code: "rubric-version",
      message: `Saņemta rubrikas versija “${extraction.rubricVersion}”, bet aprēķinam izmantota “${PROCUREMENT_CALL_RUBRIC.version}”.`,
    });
  }

  const observations = indexObservations(extraction?.observations ?? [], warnings);
  const criteria: AnalyzedCriterion[] = [];
  for (const definition of PROCUREMENT_CALL_RUBRIC.criteria) {
    const observation = observations.get(definition.id);
    criteria.push(analyzeCriterion(definition, observation, record.transcript, warnings));
  }

  const applicableWeight = criteria.reduce(
    (sum, criterion) => sum + (criterion.applicable ? criterion.weight : 0),
    0,
  );
  const earnedWeight = criteria.reduce((sum, criterion) => sum + criterion.earnedWeight, 0);

  let score: number | null = null;
  let band: CallScoreBand | null = null;
  if (applicableWeight === 0) {
    warnings.push({
      code: "no-applicable-criteria",
      message: "Zvanam nav neviena piemērojama kvalitātes kritērija.",
    });
  } else {
    score = Math.round((100 * earnedWeight) / applicableWeight);
    band = scoreBand(score);
  }

  return {
    ...record,
    rubricVersion: PROCUREMENT_CALL_RUBRIC.version,
    criteria,
    facts: cloneFacts(extraction?.facts ?? EMPTY_FACTS),
    applicableWeight,
    earnedWeight,
    score,
    band,
    warnings,
    needsReview: score === null || score < 70 || warnings.length > 0,
  };
}

function analyzeCriterion(
  definition: (typeof PROCUREMENT_CALL_RUBRIC.criteria)[number],
  observation: CallObservation | undefined,
  transcript: string,
  warnings: CallWarning[],
): AnalyzedCriterion {
  if (!observation) {
    warnings.push({
      code: "missing-observation",
      criterionId: definition.id,
      message: `Nav vērtējuma kritērijam “${definition.label}”; tas ieskaitīts kā neizpildīts.`,
    });
    return {
      criterionId: definition.id,
      label: definition.label,
      weight: definition.weight,
      sourceStatus: null,
      status: "missed",
      confidence: null,
      evidenceQuote: null,
      note: "Nav saņemts kritērija vērtējums.",
      applicable: true,
      earnedWeight: 0,
    };
  }

  const sourceStatus = validStatus(observation.status) ? observation.status : null;
  let status: ObservationStatus = sourceStatus ?? "missed";
  if (sourceStatus === null) {
    warnings.push({
      code: "invalid-status",
      criterionId: definition.id,
      message: `Kritērijam “${definition.label}” ir neatbalstīts statuss; tas ieskaitīts kā neizpildīts.`,
    });
  }

  const evidenceQuote = cleanOptionalText(observation.evidenceQuote);
  if (status === "met" || status === "partial") {
    if (!evidenceQuote) {
      warnings.push({
        code: "missing-evidence",
        criterionId: definition.id,
        message: `Pozitīvam kritērija “${definition.label}” vērtējumam nav citāta; tas ieskaitīts kā neizpildīts.`,
      });
      status = "missed";
    } else if (!containsGroundedQuote(transcript, evidenceQuote)) {
      warnings.push({
        code: "quote-not-found",
        criterionId: definition.id,
        message: `Kritērija “${definition.label}” citāts nav atrodams sarunas tekstā; tas ieskaitīts kā neizpildīts.`,
      });
      status = "missed";
    }
  }

  if (
    !Number.isFinite(observation.confidence) ||
    observation.confidence < LOW_CONFIDENCE_THRESHOLD
  ) {
    warnings.push({
      code: "low-confidence",
      criterionId: definition.id,
      message: `Kritērija “${definition.label}” vērtējumam ir zema pārliecība; nepieciešama cilvēka pārbaude.`,
    });
  }

  const applicable = status !== "not-applicable";
  return {
    criterionId: definition.id,
    label: definition.label,
    weight: definition.weight,
    sourceStatus,
    status,
    confidence: Number.isFinite(observation.confidence) ? observation.confidence : null,
    evidenceQuote,
    note: observation.note,
    applicable,
    earnedWeight: applicable ? definition.weight * statusFactor(status) : 0,
  };
}

function indexObservations(
  observations: readonly CallObservation[],
  warnings: CallWarning[],
): Map<CriterionId, CallObservation> {
  const rubricIds = new Set<string>(
    PROCUREMENT_CALL_RUBRIC.criteria.map((criterion) => criterion.id),
  );
  const indexed = new Map<CriterionId, CallObservation>();
  for (const observation of observations) {
    if (!rubricIds.has(observation.criterionId)) {
      warnings.push({
        code: "unknown-criterion",
        message: `Saņemts rubrikā nezināms kritērijs “${observation.criterionId}”; tas netika izmantots.`,
      });
      continue;
    }
    if (indexed.has(observation.criterionId)) {
      warnings.push({
        code: "duplicate-observation",
        criterionId: observation.criterionId,
        message: `Kritērijam “${observation.criterionId}” saņemti vairāki vērtējumi; izmantots pirmais.`,
      });
      continue;
    }
    indexed.set(observation.criterionId, observation);
  }
  return indexed;
}

function validStatus(value: string): value is ObservationStatus {
  return value === "met" || value === "partial" || value === "missed" || value === "not-applicable";
}

function statusFactor(status: ObservationStatus): number {
  switch (status) {
    case "met":
      return 1;
    case "partial":
      return 0.5;
    case "missed":
    case "not-applicable":
      return 0;
  }
}

function scoreBand(score: number): CallScoreBand {
  if (score >= 85) return "good";
  if (score >= 70) return "improve";
  return "review";
}

function containsGroundedQuote(transcript: string, quote: string): boolean {
  return normalizeForGrounding(transcript).includes(normalizeForGrounding(quote));
}

function normalizeForGrounding(value: string): string {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("lv");
}

function cleanOptionalText(value: string | null): string | null {
  const cleaned = value?.trim();
  return cleaned ? cleaned : null;
}

function cloneFacts(facts: CallFacts): CallFacts {
  return {
    need: facts.need,
    keyParameters: [...facts.keyParameters],
    priceTerms: facts.priceTerms,
    timing: facts.timing,
    nextAction: facts.nextAction ? { ...facts.nextAction } : null,
  };
}
