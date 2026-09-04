import { describe, expect, it } from "vitest";
import fixture from "../../samples/expected/calls-demo.json";
import { PROCUREMENT_CALL_RUBRIC } from "./rubric";
import { analyzeCall } from "./score";
import type { CallDemoFixture } from "./types";

const demo = fixture as unknown as CallDemoFixture;

describe("call quality scoring", () => {
  it("locks the four connected-call oracle scores and the no-answer attempt", () => {
    const analyses = demo.calls.map((call) => analyzeCall(call, call.extraction));

    expect(analyses.map((analysis) => analysis.score)).toEqual([90, 60, null, 80, 100]);
    expect(analyses.map((analysis) => analysis.band)).toEqual([
      "good",
      "review",
      null,
      "improve",
      "good",
    ]);
    expect(analyses.map((analysis) => analysis.needsReview)).toEqual([
      false,
      true,
      false,
      false,
      true,
    ]);
  });

  it("uses a versioned 100-point rubric and gives partial observations half credit", () => {
    expect(PROCUREMENT_CALL_RUBRIC.version).toBe("procurement-v1");
    expect(
      PROCUREMENT_CALL_RUBRIC.criteria.reduce((sum, criterion) => sum + criterion.weight, 0),
    ).toBe(100);

    const analysis = analyzeCall(demo.calls[0], demo.calls[0].extraction);
    expect(
      analysis.criteria.find((criterion) => criterion.criterionId === "next-step")?.earnedWeight,
    ).toBe(5);
    expect(analysis.score).toBe(90);
  });

  it("removes not-applicable criteria from the denominator", () => {
    const call = structuredClone(demo.calls[4]);
    const observation = call.extraction?.observations.find(
      (candidate) => candidate.criterionId === "price-terms",
    );
    if (!observation) throw new Error("Oracle observation is missing");
    observation.status = "not-applicable";
    observation.evidenceQuote = null;
    observation.confidence = 0.99;

    const analysis = analyzeCall(call, call.extraction);
    expect(analysis.applicableWeight).toBe(85);
    expect(analysis.score).toBe(100);
  });

  it("downgrades unsupported positive observations and flags low confidence", () => {
    const call = structuredClone(demo.calls[4]);
    const observation = call.extraction?.observations.find(
      (candidate) => candidate.criterionId === "greeting-identity",
    );
    if (!observation) throw new Error("Oracle observation is missing");
    observation.evidenceQuote = null;

    const analysis = analyzeCall(call, call.extraction);
    expect(analysis.score).toBe(90);
    expect(analysis.warnings.map((warning) => warning.code)).toEqual([
      "missing-evidence",
      "low-confidence",
    ]);
    expect(analysis.needsReview).toBe(true);
  });
});
