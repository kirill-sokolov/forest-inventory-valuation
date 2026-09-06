# Latvian forest inventory PDF parser, contract extraction, and call quality prototype

One-day prototype covering three workflows: Latvian forest inventory PDF parsing, clear-cut
eligibility (kailcirte, MK 935), stand valuation through an editable sortiment matrix, grounded LLM
contract data extraction with structured output, and evidence-based procurement-call quality
reports. The public demo is anonymized and contains only fictional samples.

Live demo: https://sokolov.lv/forest/

## What works

- Upload a VMD-style “Nogabalu raksturojošie rādītāji” PDF or use the bundled public sample.
- Parse stands, wrapped composition formulas, notes, non-forest rows and protection flags.
- Compare the current and assignment editions of the clear-cut diameter table.
- Recalculate volume, species shares, assortments, costs, profit and maximum purchase price in the browser.
- Copy or export the forest report as TXT, JSON or DOCX.
- Upload a Latvian purchase or lease contract, extract grounded fields and validate them.
- Use three bundled synthetic contract results without an API key.
- Review a fictional five-call day, inspect criterion evidence and generate separate employee and
  manager summaries.
- Download synthetic contract PDFs and call samples in TXT and MP3 directly from the task pages.
- Paste or upload a new call transcript for grounded observations when the server has an OpenRouter key;
  scores and day metrics are always calculated deterministically.
- Select or drop TXT or MP3. MP3 transcription separates speakers, keeps the text editable and
  downloadable, and requires a separate analysis action. The selected audio can be played locally.
  Empty, oversized and unsupported files leave existing text intact. Both analysis pages retry one interrupted/empty gateway response, then show a clear
  error while preserving the input. Explicit API errors are not retried.

## Try the examples

- Contracts: open `/forest/ligumi`, download the selected sample PDF, choose it in the upload form
  and press “Izvilkt datus”. The complete purchase example contains a 48,500 EUR price; the
  incomplete example intentionally lacks a price and contains an invalid cadastre number.
- Calls: open `/forest/zvani`, download the realistic MP3 or its source TXT, and select/drop it.
  For MP3, press “Atšifrēt MP3”, review the transcript (especially speakers and corrected numbers),
  then press “Analizēt transkriptu”. “Lejupielādēt transkriptu TXT” saves the current edited text.
  The 4:15 synthetic recording has two main speakers and a child interruption. Both original TXT
  examples remain in the picker; “Ievietot parauga tekstu” inserts a source script without a request.
- For an immediate offline demonstration, use “Skatīt gatavo rezultātu” on the contracts page or
  the preloaded call day. File uploads run a fresh model analysis; call statuses can vary from the
  prepared example. New call analyses are added to the visible day.

## Run locally

Requirements: Node.js 24 and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:5173/forest/`. The forest, contract, and call-day samples work without
secrets. To process a new contract, call transcript or MP3 through a Vercel function, copy `.env.example`
to `.env.local`, set `OPENROUTER_API_KEY`, and run the project with Vercel's local development
command.

`npm run dev` and `npm run build` prepare stable downloads under `public/samples/contracts/` and
`public/samples/calls/` from the committed synthetic fixtures. These generated directories are
ignored; `scripts/prepare-demo-files.ts` copies only the three owned PDFs and the synthetic MP3/TXT
pair and writes the two original transcripts, without copying private files or changing expected results.

Generate the committed synthetic PDFs:

```bash
npm run generate:samples
```

Fetch the seven third-party blank templates for local-only testing (they remain git-ignored):

```bash
./scripts/fetch-samples.sh
```

## Verify

```bash
npm run typecheck
npm test
npm run build
npm run lint
node --import tsx cli/forest-report.ts samples/inventory-paraugmezs.pdf
```

The same report command can also be run as `npx tsx cli/forest-report.ts samples/inventory-paraugmezs.pdf`.
With `OPENROUTER_API_KEY` set, a contract can be processed from the command line with
`npx tsx cli/contract-extract.ts contract.pdf --type purchase`.

## Architecture

1. `engine/pdf/` extracts positioned text in Node and the browser and applies shared normalization.
2. `engine/inventory/` turns registry text into typed quarters and stands and parses composition formulas.
3. `engine/rules/` stores dated law tables as data and produces a Latvian trace for every verdict.
4. `engine/calc/` performs volume, species, assortment and finance calculations as pure functions.
5. `engine/report/` creates deterministic text and JSON reports used by both the UI and CLI.
6. `src/pages/ForestPage.tsx` runs the complete forest pipeline locally in the browser.
7. `engine/contracts/` defines the structured schema, deterministic validation and e-mail summary.
8. `server/extract.ts` accepts extracted text, calls OpenRouter and never receives the original PDF;
   `npm run build` bundles it with esbuild into `api/extract.js` for Vercel.
9. `src/pages/ContractsPage.tsx` shows live or cached results with field-level grounding.
10. `engine/calls/` validates transcript evidence, applies the versioned call rubric and creates
    deterministic daily summaries.
11. `server/analyze-call.ts` maps transcript text into the fixed observation schema. The model selects
    numbered source excerpts; code copies their exact text into evidence fields. It never receives
    audio and never decides a score. Human review still verifies what each excerpt supports.
12. `server/transcribe-call.ts` validates MP3 bytes, measures duration with `music-metadata`, then
    uses Gemini 2.5 Flash audio input via the same OpenRouter key to return speaker-labelled text.
    Audio and transcripts are not persisted or logged by the application.
13. `src/pages/CallsPage.tsx` and `src/components/CallUpload.tsx` provide the offline demonstration,
    audio playback/transcription review, call drill-down and daily views.
14. `samples/` contains fictional public fixtures; private oracle files stay ignored.

## Deterministic and LLM boundaries

Every number in the forest report and call-quality dashboard comes from versioned TypeScript rules.
No LLM participates in those calculations. The contract and new-transcript flows use an LLM only to
map unstructured text into fixed schemas with source quotes. Validation, warnings, scores and daily
aggregates are deterministic. For contracts, every extracted value must carry a quote that is found
in the page-marked PDF text; a missing, unmatched or only approximately matched quote and a page
number beyond the document are flagged for human review (the value is kept, never silently dropped).

## Limits

- Scanned PDFs without a text layer are detected but not OCR-processed.
- The inventory parser targets the supplied VMD report layout; other layouts may need another adapter.
- Contract processing handles one PDF per run and limits extracted text to 200 KB.
- Calls accept TXT up to 100 KB or MP3 up to 3,200,000 bytes / 10 minutes. The base64 JSON request
  remains below Vercel's 4.5 MB limit. Transcription has a 100-second provider timeout and a separate
  best-effort limit of five requests per minute per IP. No telephony integration or persistent storage.
- Transcription sends the MP3 to an audio-capable OpenRouter model; analysis sends the reviewed text
  and start time. Use synthetic/anonymized inputs. Speaker roles and recognition can be wrong: listen,
  review and correct before scoring. The cached call day makes no request; uploaded sample MP3s
  always undergo real transcription and are never replaced with their source script.
- The rate limit is best-effort in serverless memory and is not a production abuse-control system.
- Legal eligibility remains decision support: protection-zone warnings require specialist review.
- Call scoring is coaching support, not an automated personnel decision. Low-confidence and weak
  results require human review.

## Next steps

- Integrate VMD open data where a reliable per-property source becomes available.
- Add a human review queue with corrected contract fields and audit history.
- Pilot the call rubric against a double-reviewed anonymized reference set before connecting
  telephony or sending automatic reports.
- Add OCR or a vision fallback with area-total cross-checking for scanned inventory documents.
