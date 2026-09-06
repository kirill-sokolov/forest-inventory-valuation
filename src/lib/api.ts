export class AnalysisApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisApiError";
  }
}

/** Both analyses are read-only; retry a broken transport once, never an explicit API error. */
export async function postAnalysisJson(
  url: string,
  body: unknown,
  request: typeof fetch = fetch,
): Promise<unknown> {
  const options: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    let text: string;
    try {
      response = await request(url, options);
      text = await response.text();
    } catch {
      if (attempt === 0) continue;
      throw new AnalysisApiError(
        "Neizdevās sazināties ar serveri. Ievadītie dati ir saglabāti; pārbaudiet savienojumu un mēģiniet vēlreiz.",
      );
    }

    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      // docs/spec.md §Task 2: gateways may return an empty body or HTML during an interruption.
      if (attempt === 0 && (response.ok || [502, 503, 504].includes(response.status))) continue;
      throw new AnalysisApiError(
        `Serveris neatgrieza pilnu analīzes rezultātu (HTTP ${response.status}). Ievadītie dati ir saglabāti; mēģiniet vēlreiz.`,
      );
    }

    if (!response.ok) {
      const message =
        typeof payload === "object" &&
        payload !== null &&
        "message" in payload &&
        typeof payload.message === "string"
          ? payload.message
          : `Analīze neizdevās (HTTP ${response.status}). Mēģiniet vēlreiz.`;
      throw new AnalysisApiError(message);
    }
    return payload;
  }
  throw new AnalysisApiError("Analīze neizdevās. Mēģiniet vēlreiz.");
}
