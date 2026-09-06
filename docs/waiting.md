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

## Deployment file selection (2026-09-06)

- `vercel deploy --dry --json` included local private fixtures and source assignments despite
  their `.gitignore` entries. `.vercelignore` now explicitly excludes those directories,
  third-party templates, research material and environment files from CLI uploads.

## Downloadable task examples (2026-09-06)

- Users need an input they can open and upload before the result is meaningful. Both task pages
  now lead with synthetic downloads, concrete expected observations and a three-step walkthrough.
- The published PDFs are unchanged owned fixtures; TXT downloads contain only the original
  speaker-labelled text of calls a1/a2. Dev/build generates the public copies from these sources.
- Choosing a contract sample no longer opens a prepared result implicitly; its separate preview
  action is labelled. Transcript insertion does not request an analysis. File uploads always use
  the normal model path, and a new call is added to the visible demo day.

## Interrupted responses and TXT drops (2026-09-06)

- The user reported an empty JSON response in both upload workflows, then confirmed both were
  working again before the repair was deployed. Manual requests using the public sample files
  returned HTTP 200 (call: nine criteria in 9 seconds; PDF: 48,500 EUR in 15 seconds). A build-related
  cause was suggested but not established by the available request logs.
- The client previously called `response.json()` directly. Both pages now retry one transport or
  malformed gateway response, preserve explicit JSON API errors and show Latvian messages after
  a repeated failure. Only one result is added after a successful retry.
- TXT drops use the file picker's reader and validate type, size and empty content. Existing input
  remains available after a rejected file or failed analysis.
# MP3 extension gate — 2026-09-06

Resolved: the real 4:15 MP3 transcribed in 16 seconds, preserving corrected numbers and the child speaker.
Integration exposed an existing analysis limitation on longer dialogue: GPT-4.1 mini added speaker
prefixes to mid-turn snippets and joined nonadjacent quotations with ellipses. The engine correctly
rejected eight quotes. Step 29 now uses numbered source-excerpt selection; scoring and evidence
acceptance rules are unchanged. The corrected public flow completed with all nine criteria,
retained facts and no grounding warnings; Step 28 handoff is complete.

Step 27's gate stopped twice: Vitest's deep comparison of a 3 MB Buffer exceeded the default
timeout, then the installed OpenRouter SDK required `reasoning.effort` alongside `enabled`.
The test now uses Buffer.equals (14 API tests pass); the SDK option includes `effort: "none"`.
Per the two-failure rule, the step is temporarily BLOCKED while independent UI work proceeds.
RESOLVED: the Step 28 integration run passed all 30 API/page tests, typecheck and API bundling.
