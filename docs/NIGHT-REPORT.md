# Night report — 2026-09-04

## Outcome

Both core prototypes are implemented and available from the Latvian landing page:

- `/forest/mezs` parses a VMD-style inventory PDF in the browser, applies versioned clear-cut
  rules, calculates volumes and valuation, supports live edits, and exports TXT, JSON, and DOCX.
- `/forest/ligumi` extracts text from purchase or lease PDFs in the browser, calls the guarded
  serverless extraction API for uploaded files, and offers three cached synthetic demonstrations.
- `/forest/lemumi` renders the manager-facing implementation decisions.

The public synthetic forest oracle produces 689 m³, 23 435 EUR, and 34.01 EUR/m³. Excluding the
flagged stand produces 518 m³. The generated PDFs have real text layers and were visually checked.

## Verify in five minutes

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx tsx cli/forest-report.ts samples/inventory-paraugmezs.pdf
```

Expected automated result: 17 test files pass, one live OpenRouter test is skipped without a key,
and 65 tests pass. The forest CLI headline must contain `23 435 EUR` and `34.01 EUR/m3`.

For a quick manual check, run `npm run dev`, open `http://localhost:5173/forest/`, load the forest
sample, clear or edit a matrix value, toggle the flagged stand, then open the incomplete contract
sample and inspect its validation issues and e-mail draft.

## What is intentionally not included

- Vision/OCR fallback: scanned PDFs receive a clear Latvian message and require manual review.
- Manual stand-entry grid: the overnight scope keeps the parser and two main workflows focused.
- XLSX export: the forest result already exports as TXT, JSON, and DOCX.
- Deployment: Vercel import, the environment key, Caddy proxy, and public URL check remain the
  morning manual steps described in `PLAN.md`.

## Assumptions and limits

- The current MK 935 diameter table should receive the planned human comparison with the official
  Annex 7 before the result is presented as legal guidance.
- The source Oz/Os assortment column totals 70%. The calculation preserves that input, values the
  missing 30% at zero, and points to Kamīnmalka as the likely missing share.
- Protection-zone stands remain included by default to match the worked example; warnings and an
  alternative result without them remain visible.
- A newly uploaded contract requires `OPENROUTER_API_KEY`. Cached synthetic results work without it;
  the paid live test is guarded and was not called during the final run.
- The production bundle contains the PDF.js worker and contract schema, so Vite reports one large
  client chunk. This is acceptable for the prototype and can be split after validation.

## Morning questions

1. Does the official current MK 935 table match `engine/rules/law-tables.ts`?
2. Were the missing 30% in Oz/Os intended for Kamīnmalka?
3. After deployment, do both `/forest/` and `/forest/api/extract` pass the proxy smoke check?
