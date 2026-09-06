/**
 * Chosen on 2026-09-06 after live smoke tests through the deployed function (see
 * docs/waiting.md §Contract model). All candidates advertise `structured_outputs` on OpenRouter.
 *
 * - gpt-4.1-mini: non-reasoning, strict JSON-schema output, no failures on the 40-field schema.
 * - gpt-5-nano: cheapest, works, but as a reasoning model it sometimes spends the output budget
 *   before emitting JSON ("model did not return a response"); kept as first fallback.
 * - qwen3.5-flash: cheap, needs the word "json" in the prompt; second fallback.
 * - google/gemini-2.5-flash-lite was the original default and is excluded: Google AI Studio
 *   rejects this schema deterministically ("constraint has too many states for serving").
 */
export const DEFAULT_CONTRACT_MODEL = "openai/gpt-4.1-mini";

export const CONTRACT_MODEL_FALLBACKS = ["openai/gpt-5-nano", "qwen/qwen3.5-flash-02-23"] as const;
