export type CriterionId =
  | "greeting-identity"
  | "purpose"
  | "need-object"
  | "key-parameters"
  | "price-terms"
  | "timing-decision"
  | "questions-objections"
  | "next-step"
  | "summary-close";

export type ObservationStatus = "met" | "partial" | "missed" | "not-applicable";

export type CallDisposition = "connected" | "no-answer";

export type CallScoreBand = "good" | "improve" | "review";

export interface CallRecord {
  id: string;
  startedAt: string;
  durationSec: number;
  employee: string;
  contactLabel: string;
  disposition: CallDisposition;
  transcript: string;
}

export interface CallObservation {
  criterionId: CriterionId;
  status: ObservationStatus;
  confidence: number;
  evidenceQuote: string | null;
  note: string;
}

export interface CallNextAction {
  action: string;
  owner: string;
  dueAt: string | null;
  evidenceQuote: string;
}

export interface CallFacts {
  need: string | null;
  keyParameters: string[];
  priceTerms: string | null;
  timing: string | null;
  nextAction: CallNextAction | null;
}

export interface CallExtraction {
  rubricVersion: string;
  observations: CallObservation[];
  facts: CallFacts;
}

export type CallWarningCode =
  | "rubric-version"
  | "unknown-criterion"
  | "duplicate-observation"
  | "missing-observation"
  | "invalid-status"
  | "missing-evidence"
  | "quote-not-found"
  | "ungrounded-fact"
  | "low-confidence"
  | "no-applicable-criteria";

export interface CallWarning {
  code: CallWarningCode;
  message: string;
  criterionId?: CriterionId;
}

export interface AnalyzedCriterion {
  criterionId: CriterionId;
  label: string;
  weight: number;
  sourceStatus: ObservationStatus | null;
  status: ObservationStatus;
  confidence: number | null;
  evidenceQuote: string | null;
  note: string;
  applicable: boolean;
  earnedWeight: number;
}

export interface AnalyzedCall extends CallRecord {
  rubricVersion: string;
  criteria: AnalyzedCriterion[];
  facts: CallFacts;
  applicableWeight: number;
  earnedWeight: number;
  score: number | null;
  band: CallScoreBand | null;
  warnings: CallWarning[];
  needsReview: boolean;
}

export interface CriterionStats {
  met: number;
  partial: number;
  missed: number;
  notApplicable: number;
  applicableCount: number;
}

export interface CallFollowUp extends CallNextAction {
  callId: string;
  employee: string;
  contactLabel: string;
}

export interface CallBandCounts {
  good: number;
  improve: number;
  review: number;
}

export interface EmployeeCallMetrics {
  employee: string;
  /** Explicitly never populated: reports must not rank employees. */
  rank?: never;
  callCount: number;
  connectedCount: number;
  evaluatedCount: number;
  noAnswerCount: number;
  totalDurationSec: number;
  averageEvaluatedDurationSec: number | null;
  averageScore: number | null;
  bands: CallBandCounts;
  reviewCallIds: string[];
  followUps: CallFollowUp[];
}

export interface CallDaySummary {
  date: string;
  rubricVersion: string;
  calls: AnalyzedCall[];
  callCount: number;
  connectedCount: number;
  evaluatedCount: number;
  noAnswerCount: number;
  totalDurationSec: number;
  averageEvaluatedDurationSec: number | null;
  averageScore: number | null;
  bands: CallBandCounts;
  criterionStats: Record<CriterionId, CriterionStats>;
  followUps: CallFollowUp[];
  reviewCallIds: string[];
  employees: EmployeeCallMetrics[];
}

export interface CallDemoExpectedResult {
  score: number | null;
  band: CallScoreBand | null;
  needsReview: boolean;
}

export interface CallDemoCall extends CallRecord {
  extraction: CallExtraction | null;
  expected: CallDemoExpectedResult;
}

export interface CallDemoExpectedEmployee {
  callCount: number;
  evaluatedCount: number;
  averageScore: number;
  totalDurationSec: number;
}

export interface CallDemoExpectedDay {
  callCount: number;
  connectedCount: number;
  evaluatedCount: number;
  noAnswerCount: number;
  totalDurationSec: number;
  averageEvaluatedDurationSec: number;
  averageScore: number;
  bands: CallBandCounts;
  reviewCallIds: string[];
  employeeA: CallDemoExpectedEmployee;
  employeeB: CallDemoExpectedEmployee;
}

export interface CallDemoFixture {
  date: string;
  rubricVersion: string;
  calls: CallDemoCall[];
  expectedDay: CallDemoExpectedDay;
}
