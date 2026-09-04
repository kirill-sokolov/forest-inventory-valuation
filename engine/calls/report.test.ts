import { describe, expect, it } from "vitest";
import fixture from "../../samples/expected/calls-demo.json";
import { aggregateCallDay } from "./aggregate";
import {
  createEmployeeDaySummary,
  createManagerDaySummary,
  serializeCallDay,
} from "./report";
import { analyzeCall } from "./score";
import type { CallDemoFixture } from "./types";

const demo = fixture as unknown as CallDemoFixture;

function demoDay() {
  return aggregateCallDay(
    demo.date,
    demo.calls.map((call) => analyzeCall(call, call.extraction)),
  );
}

describe("call day reports", () => {
  it("renders an employee coaching summary with their own actions", () => {
    const summary = createEmployeeDaySummary(demoDay(), "Darbinieks A");

    expect(summary).toContain("Darbinieks A");
    expect(summary).toContain("Zvani: 3");
    expect(summary).toContain("Vidējais kvalitātes vērtējums: 75,0");
    expect(summary).toContain("Nosūtīt dokumentu sarakstu");
    expect(summary).not.toContain("Darbinieks B");
  });

  it("renders a manager summary with team totals and the review queue", () => {
    const summary = createManagerDaySummary(demoDay());

    expect(summary).toContain("Zvani: 5");
    expect(summary).toContain("Kopējais ilgums: 18:20");
    expect(summary).toContain("Vidējais kvalitātes vērtējums: 82,5");
    expect(summary).toContain("Kontakts 002");
    expect(summary).toContain("Kontakts 005");
    expect(summary.toLocaleLowerCase("lv")).not.toContain("reitings");
  });

  it("serializes numeric metrics as JSON numbers", () => {
    const json = JSON.parse(serializeCallDay(demoDay())) as {
      averageScore: number;
      totalDurationSec: number;
    };

    expect(json.averageScore).toBe(82.5);
    expect(json.totalDurationSec).toBe(1_100);
  });
});
