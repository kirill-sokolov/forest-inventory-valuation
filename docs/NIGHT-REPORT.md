# Prototype handoff — updated 2026-09-06

## Outcome

All three assignment prototypes are implemented and available from the Latvian landing page:

- `/forest/mezs` parses a VMD-style inventory PDF in the browser, applies versioned clear-cut
  rules, calculates volumes and valuation, supports live edits, and exports TXT, JSON, and DOCX.
- `/forest/ligumi` extracts text from purchase or lease PDFs in the browser, calls the guarded
  serverless extraction API for uploaded files, and offers three cached synthetic demonstrations.
- `/forest/zvani` accepts TXT or MP3, supports transcription review and TXT downloads, and opens
  with a fictional five-call day. It shows criterion-level evidence and warnings and creates
  employee/manager summaries with copy, e-mail draft and JSON actions.
- `/forest/lemumi` renders the manager-facing implementation decisions for all three workflows.

The public call oracle produces five attempts, four evaluated calls, 18:20 total duration, 4:30
average evaluated duration and 82.5 average quality. The four scores are 90, 60, 80 and 100; the
60-point call and the low-confidence 100-point call are both flagged for human review. New speaker-
labelled transcript text can be analyzed through `/forest/api/analyze-call` when OpenRouter is
configured. MP3 files use the separate `/forest/api/transcribe-call` endpoint before analysis.
The model proposes observations and selects source excerpts; code copies their original text and
calculates every score and daily metric. Semantic correctness remains subject to human review.

## Verify in five minutes

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx tsx cli/forest-report.ts samples/inventory-paraugmezs.pdf
```

Expected automated result: 26 test files pass, one live-test file is skipped, 144 tests pass and two
OpenRouter live tests are skipped without a key. The forest CLI headline must contain `23 435 EUR`
and `34.01 EUR/m3`.

For a quick manual check, run `npm run dev` and open the `/forest/` URL printed by Vite. Local model
requests use the deployed API through the development proxy (see README). Then:

1. load the forest sample, edit a matrix value and toggle the flagged stand;
2. download the purchase PDF on “Līgumi”, upload it and press “Izvilkt datus”; inspect the parties,
   48,500 EUR price and e-mail draft. For an offline check, select the incomplete sample and press
   “Skatīt gatavo rezultātu”;
3. on “Zvani”, download/upload the realistic MP3, press “Atšifrēt MP3”, review/edit/download the
   transcript, then analyze it. Alternatively upload TXT or press “Ievietot parauga tekstu”.
   The new call is added to the day. The prepared day remains available without a model request:
   confirm 5 / 18:20 / 82,5, inspect contacts 002 and 005, then switch from manager to employee.

The public and local MP3-to-report workflows were verified in a real browser, including download
contents, audio playback, source quotes and a 390 px layout. The in-app browser was unavailable;
the checks used separate headless Chrome. Dated verification records follow below.

## What is intentionally not included

- Vision/OCR fallback: scanned PDFs receive a clear Latvian message and require manual review.
- Manual stand-entry grid and XLSX export: the main forest workflow already covers editable inputs
  and TXT, JSON, and DOCX exports.
- Telephony/CRM integration, persistent storage and automatic delivery: the staged production
  process is documented in `docs/calls-process.lv.md`. Short MP3 upload/transcription is now supported.

## Assumptions and limits

- The current MK 935 diameter table should receive the planned human comparison with official
  Annex 7 before the result is presented as legal guidance.
- The source Oz/Os assortment column totals 70%. The calculation preserves that input, values the
  missing 30% at zero, and points to Kamīnmalka as the likely missing share.
- Protection-zone stands remain included by default to match the worked example; warnings and an
  alternative result without them remain visible.
- New contract/call analysis and MP3 transcription require `OPENROUTER_API_KEY`; cached results and sample downloads work without it.
- `procurement-v1` is a transparent prototype rubric, not an approved personnel policy. Production
  requires a double-reviewed reference set, legal/privacy approval, role-based access, retention and
  appeal rules. Low scores and low-confidence observations require a person to review the source.
- Pilot dates, sample sizes and percentage thresholds are proposals, not measured real-call
  outcomes. Audio quality and human transcript-correction time need separate measurement.
- The production bundle includes the PDF.js worker and reports one large client chunk. This is
  acceptable for the prototype and can be split after validation.

## Remaining questions

1. Which diameter-table edition should the client approve for their workflow?
2. Were the missing 30% in Oz/Os intended for Kamīnmalka?
3. Which approved criteria, telephony source and delivery channels should replace the call
   prototype assumptions in a pilot?

## Call evidence repair — 2026-09-06

Five regression cases cover adjacent-turn quotations, altered amounts, nonadjacent excerpts,
incorrect speaker attribution and overlapping next-action evidence with different label formatting.
The reproduced API quotes now retain the original 90-point oracle score and supported facts;
the oracle files and rubric weights are unchanged. The model prompt asks for contiguous quotes and
clarifies that an unconfirmed next action or a goodbye without a recap earns partial credit.

The decisions page now states that finding a quote does not verify the extracted value against it.

Verification passed: lint, typecheck, 106 offline tests and the production build. Vercel deployment
`dpl_Hhk1HRCFdtyrYvSDfD41gTZYfWiV` is ready; all five public routes return HTTP 200, and the
JavaScript served through `sokolov.lv` is byte-for-byte identical to the locally verified bundle.
The same synthetic transcript analyzed through the production API completed in 10 seconds with
nine criteria, a score of 98, no warnings and all supported facts retained. Live model statuses can
differ from the cached 90-point example; the reproduced quote formatting itself no longer lowers
scores or removes facts. All cached oracle scores remain unchanged.

The CLI upload manifest was also checked: 116 inputs, no private fixtures, source assignments,
third-party templates or environment files. These exclusions are explicit in `.vercelignore`.

## Downloadable examples — 2026-09-06

The contract and call pages now explain the input and result and provide a visible
download/upload/analyze walkthrough. The contract picker offers three PDF inputs with concrete
checks; its separate ready-result action is explicitly labelled. Calls offer two original TXT
transcripts plus a shortcut that fills their text and metadata without analyzing. The home cards,
decisions and e-mail draft use the same entry points.

All 111 offline tests, lint, typecheck and the production build pass. New component coverage checks
download discovery, prepared-result selection, inserting a transcript and the text-only upload
requests. All five build outputs match the original PDFs/transcripts byte-for-byte; the source
oracles are unchanged. Dev/build creates the public files through `scripts/prepare-demo-files.ts`.
Browser discovery still returns no available browser, so no visual screenshot check was possible.
Production deployment `dpl_Ckp2ahbWQasZbQYgDozp76HvE5H1` is ready. Both task routes on
`sokolov.lv` return the exact verified bundle (`index-D3NMxI4u.js`). All three
`/forest/samples/contracts/*.pdf` and both `/forest/samples/calls/*.txt` downloads return HTTP 200,
the correct content type and bytes identical to the verified inputs. The Vercel build log confirms
generation of the five downloads. The source upload manifest includes 110 regular files, with no
private documents or environment contents.

## Interrupted uploads and TXT drag-and-drop — 2026-09-06

The reported upload failure recovered before the repair was deployed, as confirmed by the user
and successful requests using both public files. A deployment-related cause was not established.
Both pages previously parsed every response as JSON without handling a missing/truncated body.
They now retry one broken transport or malformed gateway response and preserve explicit API
errors. A second failure produces a Latvian message and retains the selected PDF/transcript.

The transcript area now accepts TXT drops with visual feedback. File selection and dropping share
the reader; empty, oversized, non-TXT or multiple files are rejected without losing existing text.
Reading/analysis disables conflicting input actions.

All 122 offline tests, lint, typecheck and build pass. Tests cover transport retries, persistent
empty/HTML/truncated JSON, explicit configuration errors, a single result after retry, TXT drops,
invalid files and retrying the same PDF after a failed response.

Deployment `dpl_DvjSdQAEHGgBsNwgCeFichxpdFrH` is ready. Both public routes serve the verified
`index-IEE-dqhV.js` bundle. Using the published sample files with the shared request helper, the
production call endpoint returned HTTP 200 and nine schema-valid criteria in 9 seconds; the contract
endpoint returned HTTP 200 and a schema-valid 48,500 EUR price in 13 seconds. No retry was needed.
The deployment manifest contained 112 regular files and no private/environment contents.

## MP3 transcription and dual-format call samples — 2026-09-06

The call form accepts a selected or dropped TXT/MP3. Audio is transcribed separately through
Gemini 2.5 Flash on OpenRouter, with employee/client/other/unknown speaker labels. The form retains
the MP3 player and editable text; the user can download the reviewed TXT and explicitly analyze it.
Files are limited to 3.2 MB and ten minutes, duration is measured from MPEG metadata, requests are
bounded and rate-limited, and application logs/storage do not contain the audio or transcript.

The realistic 4:15 call is offered as owned MP3 and source TXT, alongside the two earlier text
examples. Uploaded audio is never replaced with the sample script. A failed transcription preserves
both the chosen MP3 and previous text. The existing day oracle and public analysis schema are unchanged.

Local validation: 144 tests pass, two paid tests skip without a key; lint, typecheck and build pass.
Browser checks verified the actual MP3 download, browser playback duration and edited TXT download.
A mobile overflow in the call-results grid was corrected while checking the new input flow.
The in-app browser was unavailable; a separate headless Chrome test was used.
Real transcription returned all 4:15 of the sample in 16 seconds, including corrected numbers and
the child speaker. A longer-dialogue issue in the existing analysis was reproduced: the model
joined nonadjacent quotes. Generation now selects numbered contiguous source excerpts and code
copies them verbatim; the scoring and grounding engine, rubric weights and oracles are unchanged.

Production deployment `dpl_3s2umAd7E23WXKKvgMQv63en5R67` is ready and promoted. The public route
serves `index-BlN7TR6f.js`, byte-identical to the local build. A real browser run through
`https://sokolov.lv/forest/zvani` verified both sample downloads byte-for-byte, MP3 drag/drop,
255-second playback, actual transcription in 13.7 seconds, TXT export matching the returned text,
and subsequent analysis in 7.6 seconds. The call receives all nine criteria, 95 points on this run,
retained facts and next action, and no grounding warnings. Recognized speakers include the
employee, client and child. The browser reports no runtime errors and no page overflow at 390 px.
Recognition and semantic assessment can still make mistakes; the transcript and evidence remain
available for human review before using the result.

## Local development API recovery — 2026-09-06

The reported local URL had no listener on port 5174. In addition, plain Vite previously served only
the UI and had no handler for `/forest/api/` requests. Vite now proxies those paths to the existing
deployed API at `https://sokolov.lv`, including a 125-second timeout for audio transcription.
The README documents this remote request boundary, the fixed-port launch command and the separate
Vercel workflow for changing server code locally.

Lint, typecheck and build pass. Each of the three local API paths returns the deployed JSON handler's
405 response to a GET. A real browser run at `http://127.0.0.1:5174/forest/zvani` verified both sample
downloads, MP3 drag/drop and playback, transcription in 17.1 seconds, matching TXT export and
analysis in 7.0 seconds with all nine criteria and valid source quotes. No browser runtime errors
or page overflow at 390 px were observed. The development server was left running on port 5174.

## Process documentation refresh — 2026-09-06

The process panel and manager-facing documents now include MP3 transcription/review and exact
source-excerpt selection. They describe immediate, manual call/day views separately from planned
telephony, access controls and automatic delivery. The rollout durations, calibration sample size
and KPI thresholds are explicitly proposed targets without representative real-call pilot results.
Audio evaluation includes word, speaker and important-number errors; savings include human review
and correction time. The original Russian planning draft is marked historical, and obsolete current
handoff/sample descriptions are reconciled with the implementation.

Lint, typecheck, all 16 call-page tests and build pass. Local browser checks confirm the updated
process and decisions pages at 1440/390 px with no overflow, runtime errors or model requests.
Public verification of the updated copy is pending.
