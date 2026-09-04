import { describe, expect, it } from "vitest";
import fixture from "../../samples/expected/calls-demo.json";
import { aggregateCallDay } from "./aggregate";
import { analyzeCall } from "./score";
import type { CallDemoFixture } from "./types";

const demo = fixture as unknown as CallDemoFixture;

describe("daily call aggregation", () => {
  it("matches the complete synthetic-day oracle", () => {
    const day = aggregateCallDay(
      demo.date,
      demo.calls.map((call) => analyzeCall(call, call.extraction)),
    );

    expect(day.callCount).toBe(demo.expectedDay.callCount);
    expect(day.connectedCount).toBe(demo.expectedDay.connectedCount);
    expect(day.evaluatedCount).toBe(demo.expectedDay.evaluatedCount);
    expect(day.noAnswerCount).toBe(demo.expectedDay.noAnswerCount);
    expect(day.totalDurationSec).toBe(demo.expectedDay.totalDurationSec);
    expect(day.averageEvaluatedDurationSec).toBe(demo.expectedDay.averageEvaluatedDurationSec);
    expect(day.averageScore).toBe(demo.expectedDay.averageScore);
    expect(day.bands).toEqual(demo.expectedDay.bands);
    expect(day.reviewCallIds).toEqual(demo.expectedDay.reviewCallIds);
    expect(day.followUps).toHaveLength(3);
  });

  it("keeps no-answer attempts out of quality and evaluated-duration averages", () => {
    const day = aggregateCallDay(
      demo.date,
      demo.calls.map((call) => analyzeCall(call, call.extraction)),
    );

    expect(day.totalDurationSec).toBe(1_100);
    expect(day.averageEvaluatedDurationSec).toBe(270);
    expect(day.averageScore).toBe(82.5);
    expect(day.criterionStats["summary-close"]).toEqual({
      met: 1,
      partial: 0,
      missed: 3,
      notApplicable: 0,
      applicableCount: 4,
    });
  });

  it("produces separate, non-ranked employee metrics", () => {
    const day = aggregateCallDay(
      demo.date,
      demo.calls.map((call) => analyzeCall(call, call.extraction)),
    );
    const employeeA = day.employees.find((employee) => employee.employee === "Darbinieks A");
    const employeeB = day.employees.find((employee) => employee.employee === "Darbinieks B");

    expect(employeeA).toEqual(expect.objectContaining(demo.expectedDay.employeeA));
    expect(employeeB).toEqual(expect.objectContaining(demo.expectedDay.employeeB));
    expect(day.employees.map((employee) => employee.rank)).toEqual([undefined, undefined]);
  });
});
