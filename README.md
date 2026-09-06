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
- Paste a new call transcript for grounded observations when the server has an OpenRouter key;
  scores and day metrics are always calculated deterministically.

## Run locally

Requirements: Node.js 24 and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:5173/forest/`. The forest, contract, and call-day samples work without
secrets. To process a new contract or call transcript through a Vercel function, copy `.env.example`
to `.env.local`, set `OPENROUTER_API_KEY`, and run the project with Vercel's local development
command.

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
8. `api/extract.ts` accepts extracted text, calls OpenRouter and never receives the original PDF.
9. `src/pages/ContractsPage.tsx` shows live or cached results with field-level grounding.
10. `engine/calls/` validates transcript evidence, applies the versioned call rubric and creates
    deterministic daily summaries.
11. `api/analyze-call.ts` maps transcript text into the fixed observation schema; it never receives
    audio and never decides a score.
12. `src/pages/CallsPage.tsx` provides the offline demonstration, call drill-down and daily views.
13. `samples/` contains only fictional, reproducible public fixtures; private oracle files stay ignored.

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
- The call prototype starts from speaker-labelled transcript text; it does not integrate telephony,
  accept audio, or perform speech recognition. New transcripts are limited to 100 KB.
- A new transcript and its start time leave the browser for the configured OpenRouter model; use
  synthetic or anonymized text in this prototype. The bundled call day makes no model request.
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
