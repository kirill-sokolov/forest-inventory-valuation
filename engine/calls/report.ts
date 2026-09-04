import { PROCUREMENT_CALL_RUBRIC } from "./rubric";
import type { AnalyzedCall, CallDaySummary, CriterionId, EmployeeCallMetrics } from "./types";

/** Latvian employee coaching summary containing only the selected employee's data. */
export function createEmployeeDaySummary(day: CallDaySummary, employee: string): string {
  const metrics = day.employees.find((candidate) => candidate.employee === employee);
  if (!metrics) {
    return [
      "ZVANU DIENAS KOPSAVILKUMS",
      `Datums: ${day.date}`,
      `Darbinieks: ${employee}`,
      "Šajā dienā zvani nav atrasti.",
    ].join("\n");
  }

  const employeeCalls = day.calls.filter((call) => call.employee === employee);
  const strengths = rankedCriteria(employeeCalls, "strength");
  const focus = rankedCriteria(employeeCalls, "focus");
  const lines = [
    "ZVANU DIENAS KOPSAVILKUMS",
    `Datums: ${day.date}`,
    `Darbinieks: ${metrics.employee}`,
    "",
    `Zvani: ${metrics.callCount}`,
    `Savienotie zvani: ${metrics.connectedCount}`,
    `Izvērtētie zvani: ${metrics.evaluatedCount}`,
    `Kopējais ilgums: ${formatDuration(metrics.totalDurationSec)}`,
    `Vidējais izvērtētā zvana ilgums: ${formatOptionalDuration(metrics.averageEvaluatedDurationSec)}`,
    `Vidējais kvalitātes vērtējums: ${formatScore(metrics.averageScore)}`,
    "",
    "Stiprās puses",
    ...(strengths.length > 0 ? strengths.map((label) => `- ${label}`) : ["- Nav pietiekamu datu."]),
    "",
    "Ieteicamais fokuss",
    ...(focus.length > 0 ? focus.map((label) => `- ${label}`) : ["- Turpināt esošo praksi."]),
    "",
    "Turpmākās darbības",
    ...(metrics.followUps.length > 0
      ? metrics.followUps.map((followUp) => {
          const due = followUp.dueAt ? `, termiņš ${followUp.dueAt}` : "";
          return `- ${followUp.action} (${followUp.contactLabel}${due})`;
        })
      : ["- Nav fiksētu turpmāko darbību."]),
  ];

  return lines.join("\n");
}

/** Latvian team summary without employee ranking. */
export function createManagerDaySummary(day: CallDaySummary): string {
  const lines = [
    "ZVANU DIENAS KOPSAVILKUMS VADĪTĀJAM",
    `Datums: ${day.date}`,
    `Rubrika: ${day.rubricVersion}`,
    "",
    `Zvani: ${day.callCount}`,
    `Savienotie zvani: ${day.connectedCount}`,
    `Izvērtētie zvani: ${day.evaluatedCount}`,
    `Neatbildētie zvani: ${day.noAnswerCount}`,
    `Kopējais ilgums: ${formatDuration(day.totalDurationSec)}`,
    `Vidējais izvērtētā zvana ilgums: ${formatOptionalDuration(day.averageEvaluatedDurationSec)}`,
    `Vidējais kvalitātes vērtējums: ${formatScore(day.averageScore)}`,
    `Kvalitātes joslas: labi ${day.bands.good}, pilnveidojami ${day.bands.improve}, jāpārskata ${day.bands.review}`,
    "",
    "Darbinieku kopsavilkumi",
    ...day.employees.map(formatEmployeeLine),
    "",
    "Biežāk neizpildītie kritēriji",
    ...formatCommonOmissions(day),
    "",
    "Cilvēka pārbaudes rinda",
    ...formatReviewQueue(day),
    "",
    "Turpmākās darbības",
    ...(day.followUps.length > 0
      ? day.followUps.map((followUp) => {
          const due = followUp.dueAt ? `, termiņš ${followUp.dueAt}` : "";
          return `- ${followUp.action} — ${followUp.employee}, ${followUp.contactLabel}${due}`;
        })
      : ["- Nav fiksētu turpmāko darbību."]),
  ];

  return lines.join("\n");
}

/** Deterministic JSON export: no generated timestamps or environment values. */
export function serializeCallDay(day: CallDaySummary, indentation = 2): string {
  return JSON.stringify(day, null, indentation);
}

function rankedCriteria(calls: readonly AnalyzedCall[], mode: "strength" | "focus"): string[] {
  const connected = calls.filter((call) => call.score !== null);
  if (connected.length === 0) return [];

  return PROCUREMENT_CALL_RUBRIC.criteria
    .map((definition) => {
      let met = 0;
      let partial = 0;
      let missed = 0;
      for (const call of connected) {
        const criterion = call.criteria.find(
          (candidate) => candidate.criterionId === definition.id,
        );
        if (criterion?.status === "met") met += 1;
        else if (criterion?.status === "partial") partial += 1;
        else if (criterion?.status === "missed") missed += 1;
      }
      const strengthValue = met + partial * 0.5;
      const focusValue = missed + partial * 0.5;
      return { label: definition.label, strengthValue, focusValue, order: definition.weight };
    })
    .filter((criterion) =>
      mode === "strength" ? criterion.strengthValue > 0 : criterion.focusValue > 0,
    )
    .sort((left, right) => {
      const leftValue = mode === "strength" ? left.strengthValue : left.focusValue;
      const rightValue = mode === "strength" ? right.strengthValue : right.focusValue;
      return (
        rightValue - leftValue ||
        right.order - left.order ||
        left.label.localeCompare(right.label, "lv")
      );
    })
    .slice(0, 3)
    .map((criterion) => criterion.label);
}

function formatEmployeeLine(metrics: EmployeeCallMetrics): string {
  return `- ${metrics.employee}: zvani ${metrics.callCount}, izvērtēti ${metrics.evaluatedCount}, vidējais vērtējums ${formatScore(metrics.averageScore)}, ilgums ${formatDuration(metrics.totalDurationSec)}`;
}

function formatCommonOmissions(day: CallDaySummary): string[] {
  const omissions = PROCUREMENT_CALL_RUBRIC.criteria
    .map((criterion) => ({
      id: criterion.id,
      label: criterion.label,
      missed: day.criterionStats[criterion.id].missed,
      partial: day.criterionStats[criterion.id].partial,
    }))
    .filter((criterion) => criterion.missed > 0 || criterion.partial > 0)
    .sort(
      (left, right) =>
        right.missed - left.missed ||
        right.partial - left.partial ||
        rubricOrder(left.id) - rubricOrder(right.id),
    );
  return omissions.length > 0
    ? omissions.map(
        (criterion) =>
          `- ${criterion.label}: neizpildīts ${criterion.missed}, daļēji izpildīts ${criterion.partial}`,
      )
    : ["- Nav konstatētu izlaidumu."];
}

function formatReviewQueue(day: CallDaySummary): string[] {
  const reviewCalls = day.calls.filter((call) => call.needsReview);
  if (reviewCalls.length === 0) return ["- Nav zvanu, kuriem nepieciešama pārbaude."];
  return reviewCalls.map((call) => {
    const reasons = call.warnings.map((warning) => warning.message);
    if (call.score !== null && call.score < 70) reasons.unshift(`vērtējums ${call.score}`);
    return `- ${call.contactLabel} — ${call.employee}: ${reasons.join("; ")}`;
  });
}

function rubricOrder(id: CriterionId): number {
  return PROCUREMENT_CALL_RUBRIC.criteria.findIndex((criterion) => criterion.id === id);
}

function formatScore(value: number | null): string {
  return value === null ? "—" : value.toFixed(1).replace(".", ",");
}

function formatOptionalDuration(value: number | null): string {
  return value === null ? "—" : formatDuration(value);
}

function formatDuration(seconds: number): string {
  const rounded = Math.max(0, Math.round(seconds));
  const hours = Math.floor(rounded / 3_600);
  const minutes = Math.floor((rounded % 3_600) / 60);
  const remainingSeconds = rounded % 60;
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
