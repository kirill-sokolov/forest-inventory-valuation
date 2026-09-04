# Latvian forest inventory PDF parser and contract data extraction

One-day prototype for parsing Latvian forest inventory PDFs, checking clear-cut eligibility (kailcirte, MK 935), valuing forest stands through an editable sortiment matrix, and extracting structured contract data with an LLM. The public demo is anonymized and contains no client documents.

Live demo: https://sokolov.lv/forest/

## What works

- Upload a VMD-style “Nogabalu raksturojošie rādītāji” PDF or use the bundled public sample.
- Parse stands, wrapped composition formulas, notes, non-forest rows and protection flags.
- Compare the current and assignment editions of the clear-cut diameter table.
- Recalculate volume, species shares, assortments, costs, profit and maximum purchase price in the browser.
- Copy or export the forest report as TXT, JSON or DOCX.
- Upload a Latvian purchase or lease contract, extract grounded fields and validate them.
- Use three bundled synthetic contract results without an API key.

## Run locally

Requirements: Node.js 24 and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:5173/forest/`. The forest sample and cached contract samples work without secrets. To process a new contract through the Vercel function, copy `.env.example` to `.env.local`, set `OPENROUTER_API_KEY`, and run the project with Vercel's local development command.

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
10. `samples/` contains only fictional, reproducible public fixtures; private oracle files stay ignored.

## Deterministic and LLM boundaries

Every number in the forest report comes from versioned TypeScript rules and editable inputs. No LLM participates in forest calculations. The contract prototype uses an LLM only to map document text into the fixed schema. Required fields, formats, date order, currency, VAT consistency and low-confidence values are checked deterministically after extraction.

## Limits

- Scanned PDFs without a text layer are detected but not OCR-processed.
- The inventory parser targets the supplied VMD report layout; other layouts may need another adapter.
- Contract processing handles one PDF per run and limits extracted text to 200 KB.
- The rate limit is best-effort in serverless memory and is not a production abuse-control system.
- Legal eligibility remains decision support: protection-zone warnings require specialist review.

## Next steps

- Integrate VMD open data where a reliable per-property source becomes available.
- Add a human review queue with corrected contract fields and audit history.
- Add OCR or a vision fallback with area-total cross-checking for scanned inventory documents.
