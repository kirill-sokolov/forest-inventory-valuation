/**
 * Selected from OpenRouter's public model catalog on 2026-09-04. All three
 * advertised `structured_outputs`; Gemini is the default because it combines
 * low cost, a long context window, and reliable multilingual extraction.
 */
export const DEFAULT_CONTRACT_MODEL = "google/gemini-2.5-flash-lite";

export const CONTRACT_MODEL_FALLBACKS = ["qwen/qwen3.5-flash-02-23", "openai/gpt-5-nano"] as const;
