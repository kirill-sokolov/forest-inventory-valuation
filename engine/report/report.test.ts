import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculate } from "../calc";
import type { Inventory } from "../inventory/types";
import { createJsonReport, serializeJsonReport } from "./json";
import { createHeadlineLines, createTextReport } from "./text";

interface ReportOracle extends Inventory {
  report: { headlineLines: string[] };
}

function readOracle(path: string): ReportOracle {
  return JSON.parse(readFileSync(path, "utf8")) as ReportOracle;
}

function verifyReport(oracle: ReportOracle): void {
  const calculation = calculate(oracle);
  expect(createHeadlineLines(oracle, calculation)).toEqual(oracle.report.headlineLines);
  const text = createTextReport(oracle, calculation);
  expect(text.split("\n").slice(0, 4)).toEqual(oracle.report.headlineLines);
  expect(text).toContain("Nogabalu izvērtējums");
  expect(text).toContain("Tabulas redakcija: Spēkā esošā (2026)");
  expect(text).toContain("Brīdinājumi");
}

describe("forest report", () => {
  it("renders the exact public headline and extended report", () => {
    verifyReport(readOracle("samples/expected/inventory-paraugmezs.json"));
  });

  it.skipIf(!existsSync("samples/private/expected-inventory-client.json"))(
    "renders the exact guarded private headline",
    () => verifyReport(readOracle("samples/private/expected-inventory-client.json")),
  );

  it("serializes a deterministic JSON report", () => {
    const oracle = readOracle("samples/expected/inventory-paraugmezs.json");
    const calculation = calculate(oracle);
    const report = createJsonReport(oracle, calculation);
    expect(report.headlineLines).toEqual(oracle.report.headlineLines);
    expect(JSON.parse(serializeJsonReport(oracle, calculation))).toEqual(report);
    expect(report).not.toHaveProperty("generatedAt");
  });
});
