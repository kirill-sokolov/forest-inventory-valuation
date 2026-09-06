import {
  type ContractAnalysis,
  type ExtractContractOptions,
  extractContract,
  hasOpenRouterKey,
  MissingOpenRouterKeyError,
} from "../engine/contracts/extract";
import type { DocumentType } from "../engine/contracts/schema";

const MAX_TEXT_BYTES = 200 * 1024;
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;

export interface ApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  socket?: { remoteAddress?: string | null };
}

export interface ApiResponse {
  status(code: number): ApiResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string | number | readonly string[]): void;
}

interface ExtractRequestBody {
  text: string;
  documentTypeHint?: DocumentType;
  fileName: string;
}

interface RateWindow {
  count: number;
  startedAt: number;
}

type ExtractFunction = (
  text: string,
  options: Omit<ExtractContractOptions, "apiKey">,
) => Promise<ContractAnalysis>;

export interface ExtractHandlerDependencies {
  extract?: ExtractFunction;
  hasApiKey?: () => boolean;
  now?: () => number;
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function clientIp(request: ApiRequest): string {
  const forwarded = headerValue(request.headers["x-forwarded-for"]);
  if (forwarded) return forwarded.split(",")[0].trim();
  return headerValue(request.headers["x-real-ip"]) ?? request.socket?.remoteAddress ?? "unknown";
}

function decodeBody(body: unknown): unknown {
  if (typeof body !== "string") return body;
  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

function parseBody(body: unknown): ExtractRequestBody | null {
  const decoded = decodeBody(body);
  if (decoded === null || typeof decoded !== "object" || Array.isArray(decoded)) return null;
  const candidate = decoded as Record<string, unknown>;
  if (
    typeof candidate.text !== "string" ||
    candidate.text.trim().length === 0 ||
    typeof candidate.fileName !== "string" ||
    candidate.fileName.trim().length === 0
  ) {
    return null;
  }
  const hint = candidate.documentTypeHint;
  if (hint !== undefined && hint !== "purchase" && hint !== "lease" && hint !== "other") {
    return null;
  }
  return {
    text: candidate.text,
    fileName: candidate.fileName,
    documentTypeHint: hint,
  };
}

export function createExtractHandler(dependencies: ExtractHandlerDependencies = {}) {
  const extract: ExtractFunction =
    dependencies.extract ?? ((text, options) => extractContract(text, options));
  const keyAvailable = dependencies.hasApiKey ?? hasOpenRouterKey;
  const now = dependencies.now ?? Date.now;
  const rateWindows = new Map<string, RateWindow>();

  return async function handler(request: ApiRequest, response: ApiResponse): Promise<void> {
    response.setHeader("Cache-Control", "no-store");

    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      response.status(405).json({
        code: "method_not_allowed",
        message: "Atļauts tikai POST pieprasījums.",
      });
      return;
    }

    const body = parseBody(request.body);
    if (!body) {
      response.status(400).json({
        code: "invalid_request",
        message: "Jānosūta PDF faila nosaukums un pārlūkā nolasītais teksts.",
      });
      return;
    }

    if (new TextEncoder().encode(body.text).byteLength > MAX_TEXT_BYTES) {
      response.status(413).json({
        code: "text_too_large",
        message: "Dokumenta teksts pārsniedz 200 KB ierobežojumu.",
      });
      return;
    }

    if (!keyAvailable()) {
      response.status(503).json({
        code: "openrouter_not_configured",
        message: "Datu izvilkšana pašlaik nav konfigurēta. Izmantojiet pieejamo parauga rezultātu.",
      });
      return;
    }

    const timestamp = now();
    const ip = clientIp(request);
    const existing = rateWindows.get(ip);
    const window =
      existing && timestamp - existing.startedAt < RATE_WINDOW_MS
        ? existing
        : { count: 0, startedAt: timestamp };
    if (window.count >= RATE_LIMIT) {
      const retrySeconds = Math.max(
        1,
        Math.ceil((RATE_WINDOW_MS - (timestamp - window.startedAt)) / 1000),
      );
      response.setHeader("Retry-After", String(retrySeconds));
      response.status(429).json({
        code: "rate_limit_exceeded",
        message: "Sasniegts 10 pieprasījumu ierobežojums minūtē. Mēģiniet vēlreiz pēc brīža.",
      });
      return;
    }
    window.count += 1;
    rateWindows.set(ip, window);

    try {
      const result = await extract(body.text, {
        documentTypeHint: body.documentTypeHint,
        fileName: body.fileName,
      });
      response.status(200).json(result);
    } catch (error) {
      if (error instanceof MissingOpenRouterKeyError) {
        response.status(503).json({
          code: "openrouter_not_configured",
          message:
            "Datu izvilkšana pašlaik nav konfigurēta. Izmantojiet pieejamo parauga rezultātu.",
        });
        return;
      }
      response.status(500).json({
        code: "extraction_error",
        message: "Datu izvilkšana neizdevās. Mēģiniet vēlreiz vai pārbaudiet dokumentu manuāli.",
      });
    }
  };
}

export default createExtractHandler();
