import { PROCUREMENT_CALL_RUBRIC } from "./rubric";
import type {
  AnalyzedCall,
  CallBandCounts,
  CallDaySummary,
  CallFollowUp,
  CriterionId,
  CriterionStats,
  EmployeeCallMetrics,
} from "./types";

/** Daily aggregation rules from docs/spec.md, “Task 3 — call quality and daily summaries”. */
export function aggregateCallDay(date: string, calls: readonly AnalyzedCall[]): CallDaySummary {
  const copiedCalls = [...calls];
  const evaluated = copiedCalls.filter(hasScore);
  const totalDurationSec = sum(copiedCalls.map((call) => call.durationSec));
  const bands = countBands(evaluated);

  return {
    date,
    rubricVersion: PROCUREMENT_CALL_RUBRIC.version,
    calls: copiedCalls,
    callCount: copiedCalls.length,
    connectedCount: copiedCalls.filter((call) => call.disposition === "connected").length,
    evaluatedCount: evaluated.length,
    noAnswerCount: copiedCalls.filter((call) => call.disposition === "no-answer").length,
    totalDurationSec,
    averageEvaluatedDurationSec:
      evaluated.length > 0
        ? roundToOne(sum(evaluated.map((call) => call.durationSec)) / evaluated.length)
        : null,
    averageScore:
      evaluated.length > 0
        ? roundToOne(sum(evaluated.map((call) => call.score)) / evaluated.length)
        : null,
    bands,
    criterionStats: aggregateCriterionStats(evaluated),
    followUps: collectFollowUps(copiedCalls),
    reviewCallIds: copiedCalls.filter((call) => call.needsReview).map((call) => call.id),
    employees: aggregateEmployees(copiedCalls),
  };
}

function aggregateEmployees(calls: readonly AnalyzedCall[]): EmployeeCallMetrics[] {
  const byEmployee = new Map<string, AnalyzedCall[]>();
  for (const call of calls) {
    const employeeCalls = byEmployee.get(call.employee);
    if (employeeCalls) employeeCalls.push(call);
    else byEmployee.set(call.employee, [call]);
  }

  return [...byEmployee.entries()].map(([employee, employeeCalls]) => {
    const evaluated = employeeCalls.filter(hasScore);
    return {
      employee,
      callCount: employeeCalls.length,
      connectedCount: employeeCalls.filter((call) => call.disposition === "connected").length,
      evaluatedCount: evaluated.length,
      noAnswerCount: employeeCalls.filter((call) => call.disposition === "no-answer").length,
      totalDurationSec: sum(employeeCalls.map((call) => call.durationSec)),
      averageEvaluatedDurationSec:
        evaluated.length > 0
          ? roundToOne(sum(evaluated.map((call) => call.durationSec)) / evaluated.length)
          : null,
      averageScore:
        evaluated.length > 0
          ? roundToOne(sum(evaluated.map((call) => call.score)) / evaluated.length)
          : null,
      bands: countBands(evaluated),
      reviewCallIds: employeeCalls.filter((call) => call.needsReview).map((call) => call.id),
      followUps: collectFollowUps(employeeCalls),
    };
  });
}

function aggregateCriterionStats(
  calls: readonly (AnalyzedCall & { score: number })[],
): Record<CriterionId, CriterionStats> {
  const entries = PROCUREMENT_CALL_RUBRIC.criteria.map((definition) => {
    const stats: CriterionStats = {
      met: 0,
      partial: 0,
      missed: 0,
      notApplicable: 0,
      applicableCount: 0,
    };
    for (const call of calls) {
      const criterion = call.criteria.find((candidate) => candidate.criterionId === definition.id);
      if (!criterion) continue;
      switch (criterion.status) {
        case "met":
          stats.met += 1;
          stats.applicableCount += 1;
          break;
        case "partial":
          stats.partial += 1;
          stats.applicableCount += 1;
          break;
        case "missed":
          stats.missed += 1;
          stats.applicableCount += 1;
          break;
        case "not-applicable":
          stats.notApplicable += 1;
          break;
      }
    }
    return [definition.id, stats] as const;
  });
  return Object.fromEntries(entries) as Record<CriterionId, CriterionStats>;
}

function collectFollowUps(calls: readonly AnalyzedCall[]): CallFollowUp[] {
  const followUps: CallFollowUp[] = [];
  for (const call of calls) {
    if (!call.facts.nextAction) continue;
    followUps.push({
      callId: call.id,
      employee: call.employee,
      contactLabel: call.contactLabel,
      ...call.facts.nextAction,
    });
  }
  return followUps;
}

function countBands(calls: readonly (AnalyzedCall & { score: number })[]): CallBandCounts {
  const counts: CallBandCounts = { good: 0, improve: 0, review: 0 };
  for (const call of calls) {
    if (call.band) counts[call.band] += 1;
  }
  return counts;
}

function hasScore(call: AnalyzedCall): call is AnalyzedCall & { score: number } {
  return call.score !== null;
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function roundToOne(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}
