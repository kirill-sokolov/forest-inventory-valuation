import { describe, expect, it, vi } from "vitest";

import { postAnalysisJson } from "./api";

describe("analysis responses", () => {
  it("retries an empty gateway failure once and returns the successful JSON", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 502 }))
      .mockResolvedValueOnce(Response.json({ observations: [] }));

    expect(
      await postAnalysisJson("/forest/api/analyze-call", { transcript: "test" }, fetchMock),
    ).toEqual({ observations: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1]).toEqual(fetchMock.mock.calls[0]);
  });

  it("retries a broken connection once", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(Response.json({ data: {} }));
    expect(await postAnalysisJson("/forest/api/extract", {}, fetchMock)).toEqual({ data: {} });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it.each([
    [200, ""],
    [502, "<html>Bad gateway</html>"],
    [200, '{"data":'],
  ])("shows a Latvian error after repeated unusable responses (%s)", async (status, body) => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementation(async () => new Response(body, { status }));
    await expect(postAnalysisJson("/forest/api/extract", {}, fetchMock)).rejects.toThrow(
      "Serveris neatgrieza pilnu analīzes rezultātu",
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("preserves an explicit API error without retrying a paid operation", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json(
        {
          code: "openrouter_not_configured",
          message: "Analīze pašlaik nav konfigurēta.",
        },
        { status: 503 },
      ),
    );
    await expect(postAnalysisJson("/forest/api/extract", {}, fetchMock)).rejects.toThrow(
      "Analīze pašlaik nav konfigurēta.",
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
