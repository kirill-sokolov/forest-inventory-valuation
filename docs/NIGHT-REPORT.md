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

Expected automated result: 23 test files pass, one live-test file is skipped, 111 tests pass and two
OpenRouter live tests are skipped without a key. The forest CLI headline must contain `23 435 EUR`
and `34.01 EUR/m3`.

For a quick manual check, run `npm run dev`, open `http://localhost:5173/forest/`, and:

1. load the forest sample, edit a matrix value and toggle the flagged stand;
2. download the purchase PDF on “Līgumi”, upload it and press “Izvilkt datus”; inspect the parties,
   48,500 EUR price and e-mail draft. For an offline check, select the incomplete sample and press
   “Skatīt gatavo rezultātu”;
3. on “Zvani”, download a TXT and upload it or press “Ievietot parauga tekstu”, then analyze it.
   The new call is added to the day. The prepared day remains available without a model request:
   confirm 5 / 18:20 / 82,5, inspect contacts 002 and 005, then switch from manager to employee.

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
- The production deployment at `https://sokolov.lv/forest/` and its contract/call APIs were
  verified on 2026-09-06. The call evidence repair was deployed and rechecked in Steps 23–24.

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
Production publication and download verification are recorded below after deployment.
