# Assumptions and open checks

The prototype proceeds with the following documented assumptions. None blocks the three prototypes.

- The diameter-table source check is complete: all 15 values match official Annex 7 (2026-09-06).
  See the dated comparison below. This verifies the constants, not all legal conditions for a property.
- The assignment's Oz/Os assortment column totals 70%. The prototype preserves it, calculates the remaining 30% as unpriced volume, and points to Kamīnmalka as the likely missing share.
- Protection-zone stands remain included by default to match the worked example. They are flagged and an alternative total is shown without them.
- Hauling conditions and distance have no supplied formula. The prototype represents the specialist's judgment through editable forwarding and transport EUR/m³ rates.
- The public contract picker contains only our three synthetic files. Third-party templates remain local, ignored test material and are never published.
- Cached synthetic extraction results are deterministic demo fixtures. A newly uploaded contract requires `OPENROUTER_API_KEY`.
- Contract upload is one PDF per run. Multi-document batch processing is outside the one-day prototype.

## Diameter-table source check — 2026-09-06

Codex compared the official Annex 7 HTML table cell-by-cell with
`MAIN_FELLING_DIAMETER["current-2024"]` and inspected its rendered table in a browser. All 15
thresholds match, including the order of the bonitate columns and centimetre units:

| Species / code | Ia | I | II | III | IV and V |
|---|---:|---:|---:|---:|---:|
| Priede / P | 39 | 35 | 31 | 30 | 30 |
| Egle / E | 31 | 29 | 29 | 27 | 26 |
| Bērzs / B | 31 | 27 | 25 | 25 | 25 |

Sources: [MK No. 935, Annex 7](https://likumi.lv/ta/id/253760-noteikumi-par-koku-cirsanu-meza#piel7)
and [MK No. 494 of 18.08.2026](https://likumi.lv/ta/id/370370), which reissues Annex 7 in its
second annex and took effect on 21.08.2026. The values already in the code match this edition;
only the visible year needed updating to 2026. The internal `current-2024` identifier is retained
for existing data and oracle compatibility.

This resolves the source-transcription check. It is a Codex verification of these constants, not
a specialist's assessment of all felling restrictions or of any particular property's eligibility.

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

- Users need an input they can open and upload before the result is meaningful. The contract and
  call pages lead with synthetic downloads, concrete expected observations and upload instructions.
- The published PDFs are unchanged owned fixtures. The first TXT downloads contained the original
  speaker-labelled text of calls a1/a2; the MP3 extension adds a longer synthetic recording and its
  source TXT. Dev/build generates the public copies from these owned sources.
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
## MP3 extension gate — 2026-09-06 (resolved)

Resolved: the real 4:15 MP3 transcribed in 16 seconds, preserving corrected numbers and the child speaker.
Integration exposed an existing analysis limitation on longer dialogue: GPT-4.1 mini added speaker
prefixes to mid-turn snippets and joined nonadjacent quotations with ellipses. The engine correctly
rejected eight quotes. Step 29 now uses numbered source-excerpt selection; scoring and evidence
acceptance rules are unchanged. The corrected public flow completed with all nine criteria,
retained facts and no grounding warnings; Step 28 handoff is complete.

Step 27's gate stopped twice: Vitest's deep comparison of a 3 MB Buffer exceeded the default
timeout, then the installed OpenRouter SDK required `reasoning.effort` alongside `enabled`.
The test now uses Buffer.equals (14 API tests pass); the SDK option includes `effort: "none"`.
Per the two-failure rule, the step was temporarily marked BLOCKED while independent UI work
proceeded. It was resolved by the Step 28 integration run: all 30 API/page tests, typecheck and API
bundling passed. No MP3 implementation blocker remains.
