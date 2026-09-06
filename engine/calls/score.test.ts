import { describe, expect, it } from "vitest";
import fixture from "../../samples/expected/calls-demo.json";
import { PROCUREMENT_CALL_RUBRIC } from "./rubric";
import { analyzeCall } from "./score";
import type { CallDemoFixture, CriterionId } from "./types";

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

  it("retains the oracle score when quotes join adjacent turns without speaker labels", () => {
    const call = structuredClone(demo.calls[0]);
    if (!call.extraction) throw new Error("Oracle extraction is missing");
    // Quotes returned by the deployed API on 2026-09-06; the oracle statuses stay unchanged.
    const quotes: Partial<Record<CriterionId, string>> = {
      "need-object":
        "Kādu rezultātu Jūs sagaidāt no īpašuma pārdošanas? Vēlos drošu darījumu tuvāko nedēļu laikā.",
      "key-parameters":
        "Kāda ir īpašuma adrese, platība un dokumentu statuss? Adrese ir Parka iela 1, platība 4,2 hektāri, dokumenti ir sagatavoti.",
      "price-terms":
        "Kādu cenu Jūs sagaidāt un vai tajā ir iekļauti visi nosacījumi? Sagaidu 120 000 EUR.",
      "timing-decision":
        "Kad plānojat pieņemt lēmumu un kas vēl piedalās lēmumā? Līdz 15. septembrim, lēmumu pieņemšu pats.",
      "questions-objections":
        "Vai Jums ir jautājumi vai bažas par nākamo soli? Vēlos zināt nepieciešamo dokumentu sarakstu.",
    };
    for (const observation of call.extraction.observations) {
      const quote = quotes[observation.criterionId];
      if (quote) observation.evidenceQuote = quote;
    }

    const analysis = analyzeCall(call, call.extraction);

    expect(analysis.score).toBe(90);
    expect(analysis.warnings).toEqual([]);
    expect(analysis.facts).toEqual(call.extraction.facts);
  });

  it.each([
    [
      "a fabricated amount",
      "Kādu cenu Jūs sagaidāt un vai tajā ir iekļauti visi nosacījumi? Sagaidu 999 999 EUR.",
    ],
    [
      "nonadjacent turns",
      "Kādu cenu Jūs sagaidāt un vai tajā ir iekļauti visi nosacījumi? Dokumentu sarakstu nosūtīšu rīt.",
    ],
    ["a wrong speaker attribution", "Darbinieks: Sagaidu 120 000 EUR."],
  ])("still rejects a quote containing %s", (_case, quote) => {
    const call = structuredClone(demo.calls[0]);
    const observation = call.extraction?.observations.find(
      (candidate) => candidate.criterionId === "price-terms",
    );
    if (!observation) throw new Error("Oracle observation is missing");
    observation.evidenceQuote = quote;

    const analysis = analyzeCall(call, call.extraction);

    expect(analysis.criteria.find((item) => item.criterionId === "price-terms")?.status).toBe(
      "missed",
    );
    expect(analysis.facts.priceTerms).toBeNull();
    expect(analysis.warnings).toContainEqual(
      expect.objectContaining({ code: "quote-not-found", criterionId: "price-terms" }),
    );
  });

  it("keeps next-action evidence when only one overlapping quote has speaker labels", () => {
    const call = structuredClone(demo.calls[0]);
    const observation = call.extraction?.observations.find(
      (candidate) => candidate.criterionId === "next-step",
    );
    if (!observation || !call.extraction?.facts.nextAction) {
      throw new Error("Oracle next action is missing");
    }
    observation.evidenceQuote =
      "Darbinieks: Dokumentu sarakstu nosūtīšu rīt.\nDarbinieks: Paldies par sarunu, jauku dienu!";
    call.extraction.facts.nextAction.evidenceQuote =
      "Dokumentu sarakstu nosūtīšu rīt. Paldies par sarunu, jauku dienu!";

    const analysis = analyzeCall(call, call.extraction);

    expect(analysis.facts.nextAction).toEqual(call.extraction.facts.nextAction);
    expect(analysis.warnings).toEqual([]);
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

  it("projects only public call-record fields into the analysis", () => {
    const analysis = analyzeCall(demo.calls[0], demo.calls[0].extraction);

    expect(analysis).not.toHaveProperty("extraction");
    expect(analysis).not.toHaveProperty("expected");
  });

  it("drops a next action whose evidence quote is not in the transcript", () => {
    const call = structuredClone(demo.calls[0]);
    if (!call.extraction?.facts.nextAction) throw new Error("Oracle next action is missing");
    call.extraction.facts.nextAction.evidenceQuote = "Izdomāts citāts, kura sarunā nav.";

    const analysis = analyzeCall(call, call.extraction);

    expect(analysis.facts.nextAction).toBeNull();
    expect(analysis.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "quote-not-found" })]),
    );
    expect(analysis.needsReview).toBe(true);
  });

  it("does not accept an unrelated transcript quote as next-action evidence", () => {
    const call = structuredClone(demo.calls[0]);
    if (!call.extraction?.facts.nextAction) throw new Error("Oracle next action is missing");
    call.extraction.facts.nextAction = {
      action: "Nosūtīt nepamatotu maksājumu",
      owner: "Klients",
      dueAt: "2026-09-05",
      evidenceQuote: "Labdien.",
    };

    const analysis = analyzeCall(call, call.extraction);

    expect(analysis.facts.nextAction).toBeNull();
    expect(analysis.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "ungrounded-fact" })]),
    );
  });

  it("suppresses facts when their supporting criterion is not positive", () => {
    const call = structuredClone(demo.calls[0]);
    const observation = call.extraction?.observations.find(
      (candidate) => candidate.criterionId === "need-object",
    );
    if (!observation) throw new Error("Oracle observation is missing");
    observation.status = "missed";
    observation.evidenceQuote = null;

    const analysis = analyzeCall(call, call.extraction);

    expect(analysis.facts.need).toBeNull();
    expect(analysis.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "ungrounded-fact" })]),
    );
  });

  it("removes a non-ISO next-action deadline and requires review", () => {
    const call = structuredClone(demo.calls[0]);
    if (!call.extraction?.facts.nextAction) throw new Error("Oracle next action is missing");
    call.extraction.facts.nextAction.dueAt = "rīt no rīta";

    const analysis = analyzeCall(call, call.extraction);

    expect(analysis.facts.nextAction?.dueAt).toBeNull();
    expect(analysis.warnings).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "ungrounded-fact" })]),
    );
    expect(analysis.needsReview).toBe(true);
  });
});
