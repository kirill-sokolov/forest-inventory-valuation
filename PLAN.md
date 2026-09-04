# PLAN.md — overnight build plan (executor: Sol / codex CLI)

Read `AGENTS.md` and `docs/spec.md` first. Execute steps in order. A step is DONE only when its
**Verification** command exits 0; then commit. Two honest failures → mark `BLOCKED — reason`, write
`docs/waiting.md`, continue with the next independent step. Update the `Status` line of each step as
you go (`TODO` → `DONE` / `BLOCKED` / `SKIPPED`). Priorities: P0 must exist by morning; P1 should;
P2 nice; P3 optional. Time estimates are rough guidance, not limits.

Status legend below is edited by the executor. Kirill reads this file first in the morning.

---

## Step 0 — Preflight (P0, ~10 min)
Status: DONE

- Check `node -v` (≥ 24) and network: `npm view vite version` and `curl -sI https://openrouter.ai | head -1`.
- If network is blocked: write `docs/waiting.md` ("network blocked in sandbox — nothing can proceed")
  and STOP.
- Ensure the repo has an initial commit (`git log --oneline | head -1`); if empty, commit the docs.
- **Verification:** `node -v && npm view vite version`

## Step 1 — Scaffold (P0, ~20 min)
Status: DONE

- Package name `forest-inventory-valuation`. Vite + React 19 + TypeScript (strict) + Tailwind v4 +
  react-router at repo root; folders per `AGENTS.md` §Repo layout; vitest configured for `engine/`,
  `src/`, `api/`; Biome config; scripts: `dev`, `build`, `preview`, `test`, `typecheck`, `lint`.
  Path alias `@engine/*`.
- Base path: `vite.config` `base: '/forest/'`, router `basename="/forest"`, API calls built from
  `import.meta.env.BASE_URL` (so `/forest/api/extract` on the proxied host, `/api/extract` after the
  Caddy strip). `vercel.json`: rewrites `/forest/api/(.*)` → `/api/$1`, `/forest/(.*)` → `/$1`, and the
  SPA fallback for non-`/api` routes.
- `.env.example` already exists (`OPENROUTER_API_KEY=`).
- A trivial engine test and a smoke render test so the pipeline is proven.
- **Verification:** `npm run typecheck && npm test && npm run build`

## Step 2 — PDF text extraction + normalization (P0, ~40 min)
Status: DONE

- `engine/pdf/normalize.ts`: ligature replacement table (at least `Ɵ→ti`, plus `ﬁ ﬂ ﬀ ﬃ ﬄ` via NFKC),
  decimal comma helper, whitespace collapsing. Tests: `daƟ → dati`, `1,54 → 1.54`.
- `engine/pdf/extract-text.ts`: returns text items with page, x, y, str (for column clustering) and a
  plain lines view. Node implementation via `unpdf`; browser implementation via `pdfjs-dist` with
  `workerSrc` from `pdfjs-dist/build/pdf.worker.min.mjs?url`. Same output type.
- Test on the private PDF (`samples/private/inventory-client.pdf`, **skip if absent**): text
  contains `Nogabalu raksturojošie rādītāji`, `4Ba3B37`, `1A47`, and the normalized text contains
  `dati`/`inventarizācijas` forms without `Ɵ`. Plus a pure unit test of `normalize` (no PDF).
- **Verification:** `npm test -- engine/pdf`

## Step 3 — Inventory parser (P0, ~60 min)
Status: DONE

- `engine/inventory/parse.ts` → `Inventory` type (property, landUnit, parish, inventoryYear,
  quarters[{ number, stands[] }], totals{ totalHa, forestHa }). Stand: number, areaHa, landKind,
  forestType, formulaRaw (multi-line merged), origin, bonitate, heightM, diameterCm, ageYears,
  density, basalAreaM2Ha, treesPerHa, stockM3Ha, notes[] (lastFelling, lastActivity, restored,
  protection{code,text}, areaBreakdown), flags[] (`protection-zone`, `non-forest`, `no-formula`).
- Robustness: rows separated by note lines; stand numbers may skip; decimal comma; multi-quarter;
  non-forest rows; empty `koku sk.` column.
- Tests: (a) private oracle — `samples/private/expected-inventory-client.json` vs the parsed
  private PDF, **skipped when the files are absent**; (b) a synthetic two-quarter text fixture inside
  the test; (c) from Step 7b on, the public synthetic PDF.
- **Verification:** `npm test -- engine/inventory`

## Step 4 — Composition formula (P0, ~30 min)
Status: TODO

- `engine/inventory/formula.ts`: parse per spec grammar → groups, per-species shares (tenths),
  dominant species, warnings (`coefficient-sum`, `unknown-species`), `+X` admixture.
- Species registry `engine/species.ts` (codes, Latvian names, law group, matrix column).
- Tests: all 11 sample formulas, `10E`, `3P3E3B` (warning), `7Xx3B40` (warning), `8P2E+B`.
- **Verification:** `npm test -- engine/inventory/formula`

## Step 5 — Clear-cut eligibility rules (P0, ~40 min)
Status: TODO

- `engine/rules/law-tables.ts`: table A (age) and table B (diameter) as data with `edition`
  (`current-2024` default, `task-pre-2022`), bonitāte grouping, source URLs in comments.
- `engine/rules/eligibility.ts`: verdict per stand with Latvian trace, Ba exception, `not-assessed`
  for non-forest/no-formula, flags passthrough, per-edition comparison helper (which stands flip).
- Tests: private sample (guarded) → eligible {1,3,4,7,8,12} under both editions with the traces from
  spec §Oracle A 2; public synthetic stands taken from `samples/expected/inventory-paraugmezs.json`
  (no PDF needed) → spec §Oracle B 1 incl. the stand-1 flip; Bērzs IV age 52; unknown species → not
  eligible + warning.
- **Verification:** `npm test -- engine/rules`

## Step 6 — Volume, species split, assortments, finance (P0, ~50 min)
Status: TODO

- `engine/calc/volume.ts`, `species-split.ts`, `assortments.ts` (default matrix from spec as data,
  column mapping, per-column share sum check with hint), `finance.ts` (costs, profit %, max purchase,
  EUR/m³), `warnings.ts` (typed warnings with Latvian message + `anchor` naming the input they point to),
  alternative totals excluding flagged stands, `engine/calc/index.ts` = `calculate(inventory, settings)`.
- Tests: spec §Oracle A 3–5, 7 (guarded) and §Oracle B 2–4, 6 from the JSON stands (always);
  matrix edit recalculates; profit % edit.
- **Verification:** `npm test -- engine/calc`

## Step 7 — Report + CLI (P0, ~30 min)
Status: TODO

- `engine/report/text.ts`: headline exactly as spec §Final report + extended sections; `report/json.ts`.
- `cli/forest-report.ts` (run with `npx tsx`): PDF path → prints report; `--json` flag.
- Tests: headline lines for both oracles (A guarded, B from JSON stands); CLI smoke moves to Step 7b.
- **Verification:** `npm test -- engine/report`

## Step 7b — Public synthetic inventory PDF (P0, ~60 min)
Status: TODO

- `scripts/make-synthetic-inventory.tsx`: renders `samples/inventory-paraugmezs.pdf` with
  `@react-pdf/renderer` from `samples/expected/inventory-paraugmezs.json` — same column headers, row
  order, note lines, wrapped formula of stand 5, footer totals, decimal commas as the VMD form
  (`generatorNotes` in the JSON). Fictional identifiers only. Text layer must be real text (no outlines).
- Tests: parse the generated PDF → matches the JSON stands/property/totals (spec §Oracle B 7); full
  pipeline on it → headline `23 435 EUR` / `34.01 EUR/m3` and the four warnings.
- **Verification:** `npm test -- inventory-paraugmezs && npx tsx cli/forest-report.ts samples/inventory-paraugmezs.pdf | grep -q "23 435 EUR"`

## Step 8 — Web UI for task 1 (P0, ~90 min)
Status: TODO

- Pages `/` and `/mezs` per spec §Screens; sample button loads the bundled synthetic PDF
  (`samples/inventory-paraugmezs.pdf`); everything under base `/forest/`; panels; editable
  matrix and rates; edition toggle; "iekļaut" checkbox; warnings anchored to inputs (scroll +
  highlight); report block; buttons Kopēt / .txt / .json / .docx.
- Latvian labels only; readable on a laptop and a phone; no design system beyond Tailwind.
- Tests: one integration test rendering `/mezs` with the synthetic inventory JSON injected, asserting
  the headline and that unchecking stand 5 drops the total to 518 m³.
- **Verification:** `npm run typecheck && npm test && npm run build`

## Step 9 — Contract extraction engine (P1, ~60 min)
Status: TODO

- `engine/contracts/schema.ts` (zod, `Field<T>` wrapper), `validate.ts` (rules from spec), `summary.ts`
  (LV e-mail subject/body), `extract.ts` (`generateObject` via OpenRouter provider; system prompt in
  English describing Latvian real-estate contracts; one retry; `needsReview` fallback).
- `scripts/pick-model.ts`: queries `https://openrouter.ai/api/v1/models`, prints models whose
  `supported_parameters` include `structured_outputs`/`response_format`, sorted by price; the chosen
  default + 2 fallbacks go into `engine/contracts/models.ts` with a comment on why.
- Tests: validation rules on mocked results; summary rendering; schema round-trip; live test guarded by
  `OPENROUTER_API_KEY`.
- **Verification:** `npm test -- engine/contracts`

## Step 10 — Contract samples (P1, ~45 min)
Status: TODO

- `scripts/fetch-samples.sh`: downloads the templates listed in `samples/contracts/SOURCES.md` into
  git-ignored `samples/contracts/third-party/` (already fetched locally; re-fetch missing ones). They
  are for local testing only — never committed, never shown on the site.
- `scripts/make-synthetic-contract.tsx`: generates three committed PDFs in `samples/contracts/`:
  `synthetic-pirkuma-ligums.pdf` (complete purchase contract, 2 pages, realistic Latvian clauses, all
  schema fields present), `synthetic-nomas-ligums.pdf` (complete lease), `synthetic-pirkuma-nepilns.pdf`
  (purchase with missing price and a wrong-format cadastre number → validation flags). Known values in
  `samples/expected/contract-<name>.json`. Fictional parties, fictional cadastre numbers (`0000…`).
- If the key is present: run extraction once per committed sample and store
  `samples/expected/contract-<name>.extracted.json` for the cached demo mode.
- Tests: text extraction from each synthetic PDF contains its known values (no LLM); the "nepilns" one
  yields the expected validation issues from a mocked extraction.
- **Verification:** `npm test -- contracts && test "$(ls samples/contracts/synthetic-*.pdf | wc -l)" -eq 3`

## Step 11 — Contract API + UI (P1, ~60 min)
Status: TODO

- `api/extract.ts`: POST `{ text, documentTypeHint?, fileName }` (≤ 200 KB) → engine → JSON; 413 on
  oversize; best-effort in-memory per-IP limit (10/min) → 429; 503 with a clear message when no key.
- `/ligumi` page per spec §Screens: client-side text extraction, sample picker, cached results when
  the API says no key, fields table, issues, e-mail summary + `mailto:` + copy, JSON download.
- Tests: handler with mocked engine (200/413/503); page renders cached sample.
- **Verification:** `npm run typecheck && npm test && npm run build`

## Step 12 — Decisions page, README, e-mail draft (P1, ~40 min)
Status: TODO

- `DECISIONS.md` (Latvian, manager language) from `docs/decisions.ru.md` + implementation-level
  decisions worth a manager (parser-first with paid fallback only on failure; client-side calculation;
  warnings not blocking; both contract types, one schema; cached demo without key). Numbered entries:
  decision · why · what it gives. No jargon.
- `/lemumi` renders it (markdown → HTML at build time or hand-written JSX from the same text).
- `README.md` (EN, anonymized — "a take-home assignment for a Latvian real-estate & forest investment
  company"): what it is, live demo `https://sokolov.lv/forest/`, run/test commands, architecture in 10
  lines, what is deterministic vs LLM, limits, what's next (VMD open data, review queue, OCR). Title and
  first paragraph carry the search keywords: Latvian forest inventory PDF parser, clear-cut eligibility
  (kailcirte, MK 935), stand valuation, sortiment matrix, LLM contract data extraction with structured
  output. `DECISIONS.md` and the site never name the client.
- `docs/email.lv.md`: draft reply to the client (links, what to click, "upload your own PDF", the note
  that the public repo is anonymized and contains none of their files, assumptions, the diameter-table
  edition note, the Oz/Os 70 % question).
- **Verification:** `npm run build && test -s DECISIONS.md && test -s README.md`

## Step 13 — Polish + edge cases (P2, ~40 min)
Status: TODO

- Error states: non-PDF, image-only PDF (no text layer) → Latvian message + hint to the manual path;
  empty formula stand; multi-quarter PDF; huge PDF (> 20 pages) → still fine.
- Responsive check at 390 px and 1440 px; keyboard focus on inputs; number formatting (space thousands,
  comma decimals in UI, dot in JSON).
- **Verification:** `npm run typecheck && npm test && npm run build`

## Step 14 — Optional A: vision fallback (P3, ~45 min)
Status: TODO

- `api/parse-inventory.ts`: when the parser finds no stands or area sums mismatch, the client may send
  page images/text to a vision-capable model with the stand JSON schema; result is cross-checked (area
  sum vs "Kopā") and labelled "nolasīts ar AI — pārbaudiet". Skips without key.
- **Verification:** `npm test -- api/parse-inventory`

## Step 15 — Optional B: manual stand entry (P3, ~30 min)
Status: TODO

- Editable stands grid on `/mezs` as the last-resort input (paste from Excel supported via TSV).
- **Verification:** `npm run build`

## Step 16 — Optional C: XLSX export (P3, ~20 min)
Status: TODO

- SheetJS from its CDN tarball (npm tag is stale) → matrix + report sheets.
- **Verification:** `npm run build`

## Step 17 — Night report (P0, ~10 min)
Status: TODO

- Update every Status line; write `docs/NIGHT-REPORT.md`: what works (with commands to verify in
  5 minutes), what is blocked/skipped and why, assumptions made, questions for Kirill; commit.
- **Verification:** `git status --porcelain | wc -l` prints 0

---

## Morning (Kirill)

1. `git log --oneline`, read `docs/NIGHT-REPORT.md`, run `npm ci && npm test && npm run build`.
2. Eyeball MK 935 7. pielikums on likumi.lv against `engine/rules/law-tables.ts` (`current-2024`).
3. Create GitHub repo `forest-inventory-valuation` (public), push; Vercel: import repo, set
   `OPENROUTER_API_KEY`, deploy → note the `<project>.vercel.app` host.
3a. Caddy on the VPS — in wedding-quiz `caddy/sites/sokolov.caddy`, inside the `sokolov.lv` block and
   BEFORE `import app-routes`, add:
   ```
   handle_path /forest/* {
       reverse_proxy https://<project>.vercel.app {
           header_up Host <project>.vercel.app
       }
   }
   ```
   Apply by hand on the VPS (`/opt/caddy/sites/sokolov.caddy` + `caddy reload`) and commit the same
   change to the monorepo so the next deploy keeps it. Check `https://sokolov.lv/forest/` and
   `https://sokolov.lv/forest/api/extract` (expect 405/400, not 404).
4. Manual checklist: `docs/spec.md` §Test scenarios.
5. Screen recording (2–3 min): sample → report → edit matrix → warning gone → contracts sample.
6. Send `docs/email.lv.md` with the links.
