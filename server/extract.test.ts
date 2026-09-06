import { describe, expect, it, vi } from "vitest";

import type { ContractAnalysis } from "../engine/contracts/extract";
import { type ApiRequest, type ApiResponse, createExtractHandler } from "./extract";

function request(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    method: "POST",
    headers: { "x-forwarded-for": "192.0.2.10" },
    body: { text: "[PAGE 1]\nPirkuma līgums", fileName: "paraugs.pdf" },
    ...overrides,
  };
}

function response() {
  const state: { status: number; body: unknown; headers: Record<string, string> } = {
    status: 200,
    body: undefined,
    headers: {},
  };
  const res: ApiResponse = {
    status(code) {
      state.status = code;
      return res;
    },
    json(body) {
      state.body = body;
    },
    setHeader(name, value) {
      state.headers[name] = String(value);
    },
  };
  return { res, state };
}

const analysis: ContractAnalysis = {
  data: {
    document: {
      type: { value: "other", confidence: 1, source: { page: 1, quote: "Līgums" } },
      title: { value: "Līgums", confidence: 1, source: { page: 1, quote: "Līgums" } },
      signedAt: { value: null, confidence: 0, source: null },
      place: { value: null, confidence: 0, source: null },
    },
    parties: [],
    object: {
      address: { value: null, confidence: 0, source: null },
      cadastreNumber: { value: null, confidence: 0, source: null },
      area: { value: null, confidence: 0, source: null },
      description: { value: null, confidence: 0, source: null },
    },
    financials: {
      price: { value: null, confidence: 0, source: null },
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
  },
  issues: [],
  needsReview: false,
  summary: { subject: "Līgums", body: "Kopsavilkums" },
  model: "test/model",
};

describe("POST /api/extract", () => {
  it("returns 200 with extracted data", async () => {
    const extract = vi.fn().mockResolvedValue(analysis);
    const handler = createExtractHandler({ extract, hasApiKey: () => true });
    const { res, state } = response();

    await handler(request(), res);

    expect(state.status).toBe(200);
    expect(state.body).toEqual(analysis);
    expect(extract).toHaveBeenCalledWith("[PAGE 1]\nPirkuma līgums", {
      documentTypeHint: undefined,
      fileName: "paraugs.pdf",
    });
  });

  it("returns 413 for text over 200 KB", async () => {
    const handler = createExtractHandler({ extract: vi.fn(), hasApiKey: () => true });
    const { res, state } = response();
    await handler(request({ body: { text: "ā".repeat(102_401), fileName: "liels.pdf" } }), res);
    expect(state.status).toBe(413);
  });

  it("returns 503 when the server has no API key", async () => {
    const handler = createExtractHandler({ extract: vi.fn(), hasApiKey: () => false });
    const { res, state } = response();
    await handler(request(), res);
    expect(state.status).toBe(503);
    expect(state.body).toEqual(expect.objectContaining({ code: "openrouter_not_configured" }));
  });

  it("returns 405 for unsupported methods", async () => {
    const handler = createExtractHandler({ extract: vi.fn(), hasApiKey: () => true });
    const { res, state } = response();
    await handler(request({ method: "GET" }), res);
    expect(state.status).toBe(405);
    expect(state.headers.Allow).toBe("POST");
  });

  it("returns 429 after ten requests from one IP in a minute", async () => {
    const handler = createExtractHandler({
      extract: vi.fn().mockResolvedValue(analysis),
      hasApiKey: () => true,
      now: () => 1_000,
    });

    for (let index = 0; index < 10; index += 1) {
      const current = response();
      await handler(request(), current.res);
      expect(current.state.status).toBe(200);
    }
    const limited = response();
    await handler(request(), limited.res);
    expect(limited.state.status).toBe(429);
    expect(limited.state.headers["Retry-After"]).toBe("60");
  });
});
