import { readFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnalyzeCallApiRequest, AnalyzeCallApiResponse } from "./analyze-call";
import { createTranscribeCallHandler, transcribeAudio } from "./transcribe-call";

const mp3 = await readFile("samples/calls/sintetisks-zvans-ar-partraukumu.mp3");
const audio = mp3.toString("base64");
const draft = {
  complete: true,
  turns: [
    { speaker: "Darbinieks", text: "Labdien! Te Anna." },
    { speaker: "Klients", text: "Četri... nē, četri komats septiņi." },
    { speaker: "Cits", text: "Tēti!" },
  ],
  warnings: [],
};

function request(body: unknown = { audio }): AnalyzeCallApiRequest {
  return { method: "POST", headers: { "x-forwarded-for": "192.0.2.20" }, body };
}

function response() {
  const state: { status: number; body: unknown; headers: Record<string, string> } = {
    status: 200,
    body: undefined,
    headers: {},
  };
  const res: AnalyzeCallApiResponse = {
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

afterEach(() => vi.restoreAllMocks());

describe("POST /api/transcribe-call", () => {
  it("transcribes actual MP3 bytes and measures duration independently of the model", async () => {
    const transcribe = vi.fn().mockResolvedValue(draft);
    const handler = createTranscribeCallHandler({ transcribe, hasApiKey: () => true });
    const { res, state } = response();
    await handler(request(), res);
    expect(state.status).toBe(200);
    expect(transcribe).toHaveBeenCalledTimes(1);
    expect((transcribe.mock.calls[0]?.[0] as Buffer).equals(mp3)).toBe(true);
    expect(state.body).toEqual({
      transcript:
        "Darbinieks: Labdien! Te Anna.\nKlients: Četri... nē, četri komats septiņi.\nCits: Tēti!",
      durationSec: 255,
      warnings: [],
    });
    expect(state.headers["Cache-Control"]).toBe("no-store");
  });

  it.each([
    ["{broken", 400],
    [{ audio: "" }, 400],
    [{ audio: "not base64!" }, 400],
    [{ audio: Buffer.from("Not an MP3").toString("base64") }, 400],
    [{ audio: Buffer.from("ID3broken file").toString("base64") }, 400],
    [{ audio: "A".repeat(4_266_672) }, 413],
  ])("rejects invalid audio before a paid request", async (body, status) => {
    const transcribe = vi.fn();
    const handler = createTranscribeCallHandler({ transcribe, hasApiKey: () => true });
    const { res, state } = response();
    await handler(request(body), res);
    expect(state.status).toBe(status);
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("rejects overlong MP3s even if compressed below the byte limit", async () => {
    const transcribe = vi.fn();
    const handler = createTranscribeCallHandler({
      transcribe,
      hasApiKey: () => true,
      readDuration: async () => 601,
    });
    const { res, state } = response();
    await handler(request(), res);
    expect(state.status).toBe(413);
    expect(state.body).toMatchObject({ code: "audio_too_long" });
    expect(transcribe).not.toHaveBeenCalled();
  });

  it("reports missing configuration and unsupported methods", async () => {
    const transcribe = vi.fn();
    const handler = createTranscribeCallHandler({ transcribe, hasApiKey: () => false });
    const unavailable = response();
    await handler(request(), unavailable.res);
    expect(unavailable.state.status).toBe(503);
    const get = response();
    await handler({ ...request(), method: "GET" }, get.res);
    expect(get.state.status).toBe(405);
    expect(get.state.headers.Allow).toBe("POST");
    expect(transcribe).not.toHaveBeenCalled();
  });

  it.each([
    { ...draft, turns: [] },
    { ...draft, complete: false },
    { ...draft, turns: [{ speaker: "Klients", text: " " }] },
  ])("rejects missing or incomplete transcription output", async (result) => {
    const handler = createTranscribeCallHandler({
      transcribe: vi.fn().mockResolvedValue(result),
      hasApiKey: () => true,
    });
    const { res, state } = response();
    await handler(request(), res);
    expect(state.status).toBe(502);
  });

  it("hides upstream payloads and limits the sixth transcription per minute", async () => {
    const transcribe = vi.fn().mockRejectedValue(new Error("secret upstream audio payload"));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = createTranscribeCallHandler({
      transcribe,
      hasApiKey: () => true,
      now: () => 1000,
    });
    for (let i = 0; i < 5; i += 1) {
      const current = response();
      await handler(request(), current.res);
      expect(current.state.status).toBe(502);
      expect(JSON.stringify(current.state.body)).not.toContain("secret upstream");
    }
    const limited = response();
    await handler(request(), limited.res);
    expect(limited.state.status).toBe(429);
    expect(limited.state.headers["Retry-After"]).toBe("60");
    expect(transcribe).toHaveBeenCalledTimes(5);
    expect(JSON.stringify(log.mock.calls)).not.toContain("secret upstream");
  });
});

it("sends an audio content part through the real SDK, with no sample script", async () => {
  const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
    Response.json({
      id: "test-audio",
      model: "google/gemini-2.5-flash",
      created: 1,
      choices: [
        {
          index: 0,
          message: { role: "assistant", content: JSON.stringify(draft) },
          finish_reason: "stop",
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
  );
  const result = await transcribeAudio(mp3, { apiKey: "test-key", fetch: fetchMock });
  expect(result).toEqual(draft);
  const payload = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
  const parts = payload.messages.find(
    (message: { role: string }) => message.role === "user",
  ).content;
  expect(parts).toContainEqual({
    type: "input_audio",
    input_audio: { data: audio, format: "mp3" },
  });
  expect(
    JSON.stringify(
      payload.messages.filter((message: { role: string }) => message.role === "system"),
    ),
  ).not.toContain("simt divdesmit");
});
