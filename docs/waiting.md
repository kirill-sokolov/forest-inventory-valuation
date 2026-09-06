# Assumptions and open checks

The prototype proceeds with the following documented assumptions. None blocks the two core demos.

- The `current-2024` diameter values are the researched values in `docs/spec.md`. A human should visually compare `engine/rules/law-tables.ts` with MK 935 Annex 7 before presenting the result as legal guidance.
- The assignment's Oz/Os assortment column totals 70%. The prototype preserves it, calculates the remaining 30% as unpriced volume, and points to Kamīnmalka as the likely missing share.
- Protection-zone stands remain included by default to match the worked example. They are flagged and an alternative total is shown without them.
- Hauling conditions and distance have no supplied formula. The prototype represents the specialist's judgment through editable forwarding and transport EUR/m³ rates.
- The public contract picker contains only our three synthetic files. Third-party templates remain local, ignored test material and are never published.
- Cached synthetic extraction results are deterministic demo fixtures. A newly uploaded contract requires `OPENROUTER_API_KEY`.
- Contract upload is one PDF per run. Multi-document batch processing is outside the one-day prototype.

## Contract model (2026-09-06, after first live deployment)

- The overnight default `google/gemini-2.5-flash-lite` never ran live: the key was absent, so the
  cached `*.extracted.json` files were produced from the known values, not from a model call.
- Live smoke tests through the deployed function showed: Gemini Flash Lite rejects the contract
  schema deterministically ("constraint has too many states for serving"); `openai/gpt-5-nano`
  works but sometimes returns nothing (reasoning budget); `qwen/qwen3.5-flash` needs the word
  "json" in the prompt. Default is now `openai/gpt-4.1-mini` (5/5 short probes, 2/2 synthetic
  PDFs matching the known values), fallbacks are tried explicitly in code because OpenRouter's own
  fallback reacts only to provider errors.
- Schema keys are nullable rather than optional: OpenAI-compatible strict mode requires every
  property in `required`.
- Vercel transpiles ESM TypeScript per file without bundling, so `api/` now holds esbuild bundles
  generated from `server/` by `npm run build`.

## Call evidence matching (2026-09-06)

- The live model joined adjacent question/answer turns without speaker labels. Exact matching
  against the labelled transcript rejected five otherwise verbatim quotes and suppressed facts.
- Omitted line-leading speaker labels are treated as formatting only when the spoken words still
  form one contiguous span. Explicit labels must match; changed amounts and skipped dialogue are
  rejected. The same rule is used to compare next-action and criterion evidence.
- The model still interprets criterion statuses. Grounded quotes do not prove that a contract
  value or a call assessment is semantically correct; that remains a human-review responsibility.
