# Night report — 2026-09-04

## Outcome

All three assignment prototypes are implemented and available from the Latvian landing page:

- `/forest/mezs` parses a VMD-style inventory PDF in the browser, applies versioned clear-cut
  rules, calculates volumes and valuation, supports live edits, and exports TXT, JSON, and DOCX.
- `/forest/ligumi` extracts text from purchase or lease PDFs in the browser, calls the guarded
  serverless extraction API for uploaded files, and offers three cached synthetic demonstrations.
- `/forest/zvani` opens with a fictional five-call day, shows criterion-level evidence and warnings,
  and creates separate employee and manager daily summaries with copy, e-mail and JSON actions.
- `/forest/lemumi` renders the manager-facing implementation decisions for all three workflows.

The public call oracle produces five attempts, four evaluated calls, 18:20 total duration, 4:30
average evaluated duration and 82.5 average quality. The four scores are 90, 60, 80 and 100; the
60-point call and the low-confidence 100-point call are both queued for human review. New speaker-
labelled transcript text can be analyzed through `/forest/api/analyze-call` when OpenRouter is
configured. The model only proposes grounded observations; TypeScript code calculates every score
and daily metric.

## Verify in five minutes

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx tsx cli/forest-report.ts samples/inventory-paraugmezs.pdf
```

Expected automated result: 23 test files pass, one live-test file is skipped, 101 tests pass and two
OpenRouter live tests are skipped without a key. The forest CLI headline must contain `23 435 EUR`
and `34.01 EUR/m3`.

For a quick manual check, run `npm run dev`, open `http://localhost:5173/forest/`, and:

1. load the forest sample, edit a matrix value and toggle the flagged stand;
2. open the incomplete contract sample and inspect its issues and e-mail draft;
3. open “Zvanu kvalitāte”, confirm 5 / 18:20 / 82,5, inspect contacts 002 and 005, then switch the
   daily summary from manager to employee.

The local `/forest/zvani` route returned HTTP 200 during the final run. The in-app browser was not
available in the executor session, so the last visual responsive check remains part of the manual
check above; component tests cover the route, drill-down, summaries, actions and base-aware API URL.

## What is intentionally not included

- Vision/OCR fallback: scanned PDFs receive a clear Latvian message and require manual review.
- Manual stand-entry grid and XLSX export: the main forest workflow already covers editable inputs
  and TXT, JSON, and DOCX exports.
- Call audio, speech recognition, telephony/CRM integration, persistent storage and automatic
  delivery: the prototype validates the report workflow from a transcript; the staged production
  process is documented in `docs/calls-process.lv.md`.
- Deployment: Vercel import, the environment key, Caddy proxy, and public URL checks remain the
  morning manual steps described in `PLAN.md`.

## Assumptions and limits

- The current MK 935 diameter table should receive the planned human comparison with official
  Annex 7 before the result is presented as legal guidance.
- The source Oz/Os assortment column totals 70%. The calculation preserves that input, values the
  missing 30% at zero, and points to Kamīnmalka as the likely missing share.
- Protection-zone stands remain included by default to match the worked example; warnings and an
  alternative result without them remain visible.
- New contract and call inputs require `OPENROUTER_API_KEY`; every bundled sample works without it.
- `procurement-v1` is a transparent prototype rubric, not an approved personnel policy. Production
  requires a double-reviewed reference set, legal/privacy approval, role-based access, retention and
  appeal rules. Low scores and low-confidence observations require a person to review the source.
- The production bundle includes the PDF.js worker and reports one large client chunk. This is
  acceptable for the prototype and can be split after validation.

## Morning questions

1. Does the official current MK 935 table match `engine/rules/law-tables.ts`?
2. Were the missing 30% in Oz/Os intended for Kamīnmalka?
3. Which approved criteria, telephony source and delivery channels should replace the call
   prototype assumptions in a pilot?
4. After deployment, do `/forest/`, `/forest/zvani`, `/forest/api/extract` and
   `/forest/api/analyze-call` pass the proxy smoke check?
