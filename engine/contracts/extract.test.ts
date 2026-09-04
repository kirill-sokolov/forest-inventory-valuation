import { describe, expect, it } from "vitest";
import {
  analyzeContract,
  buildExtractionPrompt,
  extractContract,
  MissingOpenRouterKeyError,
} from "./extract";
import type { ContractExtraction } from "./schema";

const minimalPurchase: ContractExtraction = {
  document: {
    type: { value: "purchase", confidence: 0.95, source: { page: 1, quote: "PIRKUMA LĪGUMS" } },
    title: {
      value: "Pirkuma līgums",
      confidence: 0.95,
      source: { page: 1, quote: "Pirkuma līgums" },
    },
    signedAt: {
      value: "2026-09-01",
      confidence: 0.9,
      source: { page: 1, quote: "2026. gada 1. septembrī" },
    },
    place: { value: "Rīga", confidence: 0.9, source: { page: 1, quote: "Rīgā" } },
  },
  parties: [
    {
      role: { value: "seller", confidence: 0.9, source: { page: 1, quote: "Pārdevējs" } },
      name: { value: "SIA Pirmais", confidence: 0.9, source: { page: 1, quote: "SIA Pirmais" } },
      registrationNumber: {
        value: "40000000001",
        confidence: 0.9,
        source: { page: 1, quote: "40000000001" },
      },
      personalCode: { value: null, confidence: 0, source: null },
      address: { value: null, confidence: 0, source: null },
      representative: { value: null, confidence: 0, source: null },
      iban: { value: null, confidence: 0, source: null },
    },
    {
      role: { value: "buyer", confidence: 0.9, source: { page: 1, quote: "Pircējs" } },
      name: { value: "SIA Otrais", confidence: 0.9, source: { page: 1, quote: "SIA Otrais" } },
      registrationNumber: {
        value: "40000000002",
        confidence: 0.9,
        source: { page: 1, quote: "40000000002" },
      },
      personalCode: { value: null, confidence: 0, source: null },
      address: { value: null, confidence: 0, source: null },
      representative: { value: null, confidence: 0, source: null },
      iban: { value: null, confidence: 0, source: null },
    },
  ],
  object: {
    address: {
      value: "Parauga iela 1",
      confidence: 0.9,
      source: { page: 1, quote: "Parauga iela 1" },
    },
    cadastreNumber: {
      value: "00000000001",
      confidence: 0.9,
      source: { page: 1, quote: "00000000001" },
    },
    area: { value: null, confidence: 0, source: null },
    description: { value: null, confidence: 0, source: null },
  },
  financials: {
    price: {
      value: { amount: 1000, currency: "EUR" },
      confidence: 0.9,
      source: { page: 1, quote: "1000 EUR" },
    },
    rent: { value: null, confidence: 0, source: null },
    vat: { value: null, confidence: 0, source: null },
    deposit: { value: null, confidence: 0, source: null },
    paymentDeadline: { value: null, confidence: 0, source: null },
    penalty: { value: null, confidence: 0, source: null },
  },
  term: {
    effectiveFrom: { value: null, confidence: 0, source: null },
    effectiveTo: { value: null, confidence: 0, source: null },
    durationMonths: { value: null, confidence: 0, source: null },
    noticePeriodDays: { value: null, confidence: 0, source: null },
    autoRenewal: { value: null, confidence: 0, source: null },
  },
  specialConditions: [],
};

describe("contract extraction engine", () => {
  it("never accepts a missing API key", async () => {
    await expect(extractContract("contract text", { apiKey: "" })).rejects.toBeInstanceOf(
      MissingOpenRouterKeyError,
    );
  });

  it("builds a page-aware prompt without changing the source text", () => {
    const text = "[PAGE 1]\nPIRKUMA LĪGUMS";
    const prompt = buildExtractionPrompt(text, "purchase", "paraugs.pdf");
    expect(prompt).toContain(text);
    expect(prompt).toContain("purchase");
    expect(prompt).toContain("paraugs.pdf");
  });

  it("adds deterministic validation and a Latvian summary", () => {
    const result = analyzeContract(minimalPurchase, "test/model");
    expect(result.data).toEqual(minimalPurchase);
    expect(result.model).toBe("test/model");
    expect(result.needsReview).toBe(false);
    expect(result.summary.subject).toContain("Pirkuma līgums");
  });
});
