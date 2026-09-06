---
date: 2026-09-04
topic: forest-inventory-valuation
research: docs/research/research.md (local, git-ignored)
status: approved by Kirill 2026-09-04 (brainstorm) — executor: Sol (codex CLI), overnight
---

# Forest inventory valuation + contract data extraction — take-home assignment (client anonymized)

## What We're Building

A public demo site (Latvian UI) with three working prototypes for a Latvian real-estate & forest
investment company's hiring assignment, plus a plain-language "decisions" page for its managers.
The client is not named anywhere in tracked files ("pasūtītājs" / "the client"); its documents and
its real inventory PDF are git-ignored (`docs/task/`, `samples/private/`).

1. **Meža inventarizācija → cirsmas vērtība.** Upload a forest inventory PDF from the Latvian
   State Forest Register (form "Nogabalu raksturojošie rādītāji"). The app reads the stand table,
   decides which stands may be clear-cut (kailcirte) by the legal age/diameter tables, computes
   volume, splits it by species from the composition formula, runs the assortment (sortiment)
   matrix with prices and costs, and prints the final report with the maximum purchase price.
   Every number is deterministic; every input (matrix shares, prices, cost rates, table edition,
   flagged stands) is editable on the page and recalculates instantly. Warnings never block.
2. **Līgumu datu izvilkšana.** Upload a real-estate contract PDF (purchase or lease, Latvian).
   An LLM extracts structured fields by a fixed schema — each field with confidence and the
   source quote — then deterministic validation flags what a human must check. Output: a table
   and an e-mail summary text.
3. **Zvanu kvalitātes analīze.** Analyze a completed call transcript against a versioned
   procurement-call rubric, show evidence for every result, and aggregate a synthetic workday into
   separate employee and manager summaries. The bundled demo is deterministic and requires no API
   key; short MP3 files can be transcribed for review before analysis. Telephony integration remains
   a documented future step.

Deliverables: public anonymized repo `forest-inventory-valuation`, live site at
`https://sokolov.lv/forest/` (Vercel behind a Caddy reverse proxy), `DECISIONS.md` rendered as a
page, README, CLI for task 1, synthetic sample files, tests on two oracles (private real PDF,
public synthetic PDF).

## Why This Approach

- **Custom automation, not a product or library.** Research (docs/research/research.md) found no
  product or OSS that reads the state registry PDF and carries it to a stand value by MK 935
  rules; Latvian calculators price by comparable deals, global systems expect field cruises.
- **Deterministic parser first, paid fallbacks last.** Numbers shown to a manager must come from
  code that can be unit-tested against the worked example. Vision/OCR on cheap models is poor and
  costs money; normal registry PDFs have a clean text layer, so failures should be rare and 1–2 API
  calls per failure are acceptable. (Kirill, 2026-09-04)
- **Client-side calculation, serverless only for the LLM.** No DB, no auth, no infra. Vercel Hobby
  limits (4.5 MB body, 300 s) are avoided by sending extracted text, never the PDF.
- **Law tables as versioned data.** The assignment's diameter table is the pre-29.06.2022 edition;
  the Constitutional Court (08.04.2024) changed what is in force. The app ships both editions,
  prints which one it used, and shows the difference.

## Key Decisions

- **No auth, no DB, no infrastructure.** One-day prototype; everything reversible. (Kirill)
- **Language.** UI, report, decisions page, e-mail draft — Latvian. Code, comments, README, commit
  messages — English. No Russian in tracked files (docs/decisions.ru.md is the draft source for
  the LV page; docs/research and docs/task are git-ignored).
- **Task 1 numbers are never produced by an LLM.** The parser is the source of truth; the vision
  fallback (optional step) may only propose a stand table that is then cross-checked (area sums
  must match the PDF's "Kopā" totals) and marked "read by AI — verify".
- **Warnings, not blocking.** Protection-zone stands stay in the calculation but are flagged and an
  alternative total without them is shown; inconsistent inputs (matrix column ≠ 100 %, coefficient
  sum ≠ 10, edition mismatch) produce a "Brīdinājumi" section with a fix hint. The report always
  renders. (Kirill: 1 да, 2 да)
- **Both contract types** (purchase + lease) with one shared schema; purchase is the primary demo.
- **Editable everything.** Matrix shares/prices, cost rates, profit %, table edition, include/exclude
  flagged stands — edits recalculate live (pure functions).
- **Model choice is data-driven.** The extraction model is picked from OpenRouter's model list by
  `structured_outputs` support and price; a fallback list exists; the demo works without a key by
  serving cached extraction results for the bundled samples.
- **Call scoring stays deterministic.** A model may propose criterion observations for a new call,
  but code validates evidence, applies the rubric weights, calculates every score and daily metric,
  and sends low-confidence cases to human review. Synthetic calls use committed observations.
- **Two oracles.** The client's real PDF and its expected numbers stay local in `samples/private/`
  (git-ignored; tests that need them skip when the files are absent). The public oracle is a synthetic
  PDF in the same VMD layout (`samples/inventory-paraugmezs.pdf`, generated by our script from
  `samples/expected/inventory-paraugmezs.json`) with deliberate edge cases: a stand that flips between
  table editions, a formula summing to 9, an oak stand that makes the 70 % matrix column cost money, a
  protection-zone stand, a wrapped formula, a non-forest row.
- **Anonymized public repo.** No client name, no real cadastre numbers, property or parish names in
  tracked files. Third-party contract templates are not committed (fetch script + `SOURCES.md`); only
  our generated synthetic contracts are.
- **Repo/URL.** GitHub `kirill-sokolov/forest-inventory-valuation` (public). Vercel project (static + functions). Public URL `https://sokolov.lv/forest/`: Caddy on
  Kirill's VPS proxies `handle_path /forest/*` to the Vercel deployment (no DNS change). The app is
  built with `base: '/forest/'` and router basename `/forest`; `vercel.json` also rewrites
  `/forest/*` → `/*` so the raw vercel.app URL works too.

## Out of Scope

- Authentication, users, persistence, history of runs, multi-tenant anything.
- OCR of scanned PDFs (detect "no text layer" → clear message + manual path; no tesseract).
- VMD registry API / open-data integration (documented as "next step" only).
- Batch processing of many PDFs; background jobs.
- XLSX export (optional step only; SheetJS npm is stale — use CDN build if attempted).
- English UI (README is English; site is Latvian only).
- Sending e-mail (only `mailto:` + copy to clipboard).
- Live telephony, call storage, scheduled delivery, and employee monitoring. Task 3 accepts a
  transcript or a short MP3 and demonstrates the decision-support workflow.
- Exact cent-level replication of the employer's Excel rounding chain (see Oracle tolerances).
- Production hardening beyond basic input size limits and a best-effort per-IP rate limit.
- Legal opinion on protection zones — the app flags, the human decides.

## Domain Rules (what the executor cannot derive from code)

### Input: "Nogabalu raksturojošie rādītāji" (VMD form)

Header lines: `Zemes vienības apzīmējums- <11 digits>`, `Īpašums - <cadastre> - <name>`,
`<parish> pagasts`, `Saimniecība: <name>`, `inv. veikta <year>. gadā`, quarter lines `N. kvartāls`.
Stand rows (one per nogabals) carry, in column order:

`Kvartāls/nogabals` · `Ģeo platība, ha` (decimal comma) · `Meža zemes veids` (e.g. Mežaudze, or a
non-forest kind like "Meža dzīvnieku barošanas lauce") · `Meža tips` (Ap, Vr, As…) · `Nogabala
apraksts` = composition formula (may wrap to a second line, e.g. `4Ba3B37 2Ba26` + `1A47`) ·
`Izcelšanās` (D) · dominant species: `bonitāte` (Ia, I, II, III, IV, V…) · `vid. augstums` (m) ·
`vid. caurmērs` (cm) · `vecums` (years) · stand: `biezība` · `Šķērslauk. m2/ha` · `koku sk. gab/ha`
(often empty) · `krāja m3/ha`.

Note lines belong to the stand above them: `Pēdējais cirtes izpildes veids un gads: …`,
`Pēdējais darbības veids un gads: …`, `Atjaunots: …`, `Aizs.paz.- <code> <text>` (protection
zone / restriction — **flag**), `Platību sadalījums: t.sk. mežs X ha, t.sk. ceļi Y ha, t.sk. grāvji Z ha`.
Footer: `Kopā platība kvartālā (ha): 6,65`, `Kopā platība kadastrā (ha)`, `Pavisam kopā (ha)`, with
`t.sk. mežs 6,33 ha`. A page 2 is a map image (ignore). Stand numbers may skip (no stand 6 here).

Text-layer trap: the `ti` ligature is emitted as a private glyph (seen as `Ɵ`, e.g. `daƟ` for
`dati`). Normalize with an explicit replacement table plus NFKC before parsing; test it.

### Composition formula (mežaudzes sastāva formula)

Grammar: `formula := group (" " group)*`, `group := (coef species)+ age?`, `coef := 1..10`,
`species := letter code (P, E, B, Ba, M or Ma, A, Bl, Os, Oz, L, …)`, `age := integer years`.
The trailing age applies to every species in its group (`4Ba3B37` = Ba 40 % age 37, B 30 % age 37).
Coefficients are tenths and must sum to 10 across the whole formula (else **warning**, still compute
with the given tenths). A species may repeat across groups (sum its shares). `+X` (admixture < 5 %)
= present, share 0, listed in notes. Dominant species = largest total share; tie → first listed.
Eligibility uses the PDF's dominant-species columns (bonitāte, caurmērs, vecums), not formula ages.

Species codes (source: LLKC "Mežsaimniecības pamati", medium trust; unverified ones marked):
P Priede (pine) · E Egle (spruce) · B Bērzs (birch) · Ba Baltalksnis (grey alder) · M/Ma Melnalksnis
(black alder) · A Apse (aspen) · Bl Blīgzna (goat willow) · Os Osis (ash) · Oz Ozols (oak) ·
L Lapegle (larch, assumed) · Kļ/K Kļava (maple, unverified) · Li Liepa (unverified) · G Goba
(unverified) · Vī Vīksna (unverified) · Ie Ieva (unverified). Unknown code → treated as "Citi",
**warning** "nezināms sugas kods".

### Clear-cut (kailcirte) eligibility

A stand is eligible if the dominant species reached the **age** in table A **or** the **diameter**
in table B (MK 935 §9: age OR diameter; inside protected nature territories only age counts — not
modelled, just a note). **Baltalksnis (Ba) is always eligible** (assignment statement). Non-forest
rows (no formula / no stock) are "not assessed". Every verdict carries a trace string in Latvian,
e.g. `B, I bonitāte: vecums 73 ≥ 71 ✓` or `E, Ia: vecums 42 < 81, caurmērs 19 < 31 ✗`.

Table A — main felling age (years), Meža likums 9. pants; columns by bonitāte group
`I un augstāka (Ia, I)` / `II–III` / `IV un zemāka (IV, V, Va)`:

| Species group | I+ | II–III | IV− |
|---|---|---|---|
| Ozols (Oz) | 101 | 121 | 121 |
| Priede (P), Lapegle (L) | 101 | 101 | 121 |
| Egle (E), Osis (Os), Liepa, Goba, Vīksna, Kļava | 81 | 81 | 81 |
| Bērzs (B) | 71 | 71 | 51 |
| Melnalksnis (M/Ma) | 71 | 71 | 71 |
| Apse (A) | 41 | 41 | 41 |

Species not in table A (Ba handled above; Bl and others): no age rule → not eligible by age.

Table B — mean diameter of the dominant stand (cm), MK 935 7. pielikums. Two editions ship as data:

| Species | Edition | Ia | I | II | III | IV–V |
|---|---|---|---|---|---|---|
| Priede | `task-pre-2022` (assignment) | 39 | 35 | 31 | 27 | — |
| Priede | `current-2024` (in force) | 39 | 35 | 31 | 30 | 30 |
| Egle | `task-pre-2022` | 31 | 29 | 29 | 27 | — |
| Egle | `current-2024` | 31 | 29 | 29 | 27 | 26 |
| Bērzs | `task-pre-2022` | 31 | 27 | 25 | 22 | — |
| Bērzs | `current-2024` | 31 | 27 | 25 | 25 | 25 |

Default edition: `current-2024`. The report prints the edition used and, when the two editions
disagree for the loaded PDF, a warning listing the stands that flip. The `current-2024` numbers come
from two independent fetches of likumi.lv by the research wave; **morning task for Kirill: eyeball
7. pielikums once** (open question).

Protection zone: a stand whose notes contain `Aizs.paz.` gets flag `protection-zone` with the note
text. It stays included by default (matches the employer's example) with an "iekļaut" checkbox;
the report shows the alternative totals without flagged stands.

### Volume, species split, assortments, finance

- `volume_m3 = krāja_m3_ha × ģeo_platība_ha` per eligible stand, full precision.
- Species volume = stand volume × species share (tenths / 10); sum per species over eligible stands.
- Matrix columns: `P`, `E`, `B`, `Ma`, `A`, `Ba`, `Oz/Os`, `Citi`. Mapping: P→P, E→E, B→B,
  M/Ma→Ma, A→A, Ba→Ba, Oz and Os→Oz/Os, everything else→Citi.
- Default matrix = the employer's example (share % of the species volume, price EUR/m³):

| Assortment | P | E | B | Ma | A | Ba | Oz/Os | Citi |
|---|---|---|---|---|---|---|---|---|
| A klase | 3 % @120 | | | | | | | |
| Finieris A | | | 5 % @150 | | | | | |
| Finieris B | | | 15 % @110 | | | | | |
| Finieris C | | | 10 % @90 | | | | | |
| ZB (zāģbaļķi) | 70 % @100 | 50 % @100 | | 30 % @80 | 20 % @80 | | 10 % @200 | |
| SB (sīkbaļķi) | 7 % @80 | 15 % @80 | | | | | | |
| Tara | 10 % @60 | 10 % @60 | 30 % @50 | 40 % @50 | 50 % @50 | 20 % @50 | 60 % @60 | |
| PM (papīrmalka) | 7 % @50 | 20 % @50 | 30 % @40 | | 20 % @45 | | | |
| Kamīnmalka | | | | | | | — @50 | |
| Malka | 3 % @38 | 5 % @38 | 10 % @38 | 30 % @38 | 10 % @38 | 80 % @38 | | 100 % @38 |
| Gulsnis | — @70 | | | | | | | |
| **Column sum** | 100 | 100 | 100 | 100 | 100 | 100 | **70** | 100 |

  The Oz/Os column sums to 70 % in the employer's data (Kamīnmalka has a price but no share) →
  **warning** with hint "30 % nav sadalīti; iespējams, Kamīnmalka". Shares and prices are editable.
- Revenue = Σ over species and assortments of `species_volume × share × price`.
- Costs per m³ of total volume: `ciršana 11`, `pievešana 7`, `transports 6` EUR/m³ (editable).
- `profit = 10 % × (revenue − costs)` (editable %); `max_purchase = revenue − costs − profit`;
  `price_per_m3 = max_purchase / total_volume`.
- Rounding: full precision internally; display m³ and EUR as integers in the headline, 2 decimals in
  tables, EUR/m³ with 2 decimals. Also show the totals excluding flagged stands.

### Final report (Gala atskaite) — exact headline format from the assignment

```
NĪ Paraugmežs, zemes vienība 00000000042
Kailcirtes: 2.nog;3.nog;5.nog;7.nog;8.nog
Cērtamais apjoms: 689 m3 (E=149 m3; B=254 m3; A=94 m3; Ba=87 m3; Oz=75 m3; Os=30 m3)
Maksimālā iegādes summa = 23 435 EUR, jeb 34.01 EUR/m3.
```
(Format is the client's; values are the public synthetic sample. Species are listed by species-code
totals, rounded to integers. The client's own example wrote a 12.72 m³ species as `12` — a manual
rounding slip; we round normally and say so in DECISIONS.) Extended report below the headline: per-stand table (nogabals, platība,
formula, valdošā suga, bonitāte, vecums, caurmērs, verdict + trace, flags, apjoms), species totals,
assortment revenue table, costs/profit lines, `Tabulas redakcija: …` line, `Brīdinājumi` section,
alternative totals without flagged stands. Exports: copy text, `.txt`, `.json`, `.docx`.

### Task 2 — contract extraction

Schema (zod). Every leaf is `Field<T> = { value: T | null, confidence: 0..1, source: { page?: number,
quote: string } | null }`:

- `document`: `type` (`purchase` | `lease` | `other`), `title`, `signedAt` (ISO date), `place`
- `parties[]`: `role` (`seller` | `buyer` | `lessor` | `lessee` | `other`), `name`,
  `registrationNumber`, `personalCode`, `address`, `representative`, `iban`
- `object`: `address`, `cadastreNumber`, `area` (`{ value, unit }`), `description`
- `financials`: `price` (`{ amount, currency }`), `rent` (`{ amount, currency, period }`),
  `vat` (`{ included, rate }`), `deposit`, `paymentDeadline`, `penalty` (text)
- `term`: `effectiveFrom`, `effectiveTo`, `durationMonths`, `noticePeriodDays`, `autoRenewal`
- `specialConditions[]`: `{ title, quote, page }` (penalties, pre-emption rights, termination,
  encumbrances, conditions precedent)

Validation (deterministic, Latvian messages, `severity: error | warning`): required fields by
document type (≥ 2 parties with names; object address or cadastre number; price for purchase / rent
for lease; signedAt); date order `signedAt ≤ effectiveFrom ≤ effectiveTo`; `registrationNumber` =
11 digits (format only — checksum is not public); `personalCode` = `DDMMYY-NNNNN` or 11 digits
starting with `32`; `cadastreNumber` = 11 digits; IBAN via `ibantools`; VAT consistency when both
gross and net appear (rate 21 %); currency EUR; `confidence < 0.7` or missing required → `needsReview`.
Output: JSON, table (value · confidence · quote · status), e-mail summary (LV: subject + body with
parties, object, money, term, special conditions, issues list) via `mailto:` and copy.

Samples: public Latvian templates are fetched on demand into git-ignored
`samples/contracts/third-party/` (sources in `samples/contracts/SOURCES.md`; blanks demonstrate
validation) and used for local testing only. Committed and shown on the site: three generated
synthetic contracts — a complete purchase contract, a complete lease, and a purchase contract with
gaps — each with known values in `samples/expected/contract-*.json`. The site serves cached
extraction results for bundled samples when no API key is configured.

The sample PDF download is visible on first visit. Selecting a sample shows what to check in the
result; a separate action opens the ready-made result. To try a fresh extraction, the user downloads
the PDF, selects it in the upload form, and presses “Izvilkt datus”. The page explains the expected
parties, money, dates, source quotes and e-mail summary in plain Latvian.

Both analysis pages handle empty/non-JSON gateway responses without exposing JSON parser errors.
One transient transport failure may be retried; explicit application errors (including missing
configuration and rate limits) must remain visible. A failed analysis retains the selected input.

### Task 3 — call quality and daily summaries

The original task asks for a quality report after each procurement-team call and a daily summary
for both the employee and manager. No recordings, transcripts, telephony vendor, CRM fields, or
approved rubric were supplied. The prototype therefore starts from a transcript with explicit
`Darbinieks:` / `Klients:` speaker labels and uses only fictional samples.

Input record: `id`, ISO `startedAt`, `durationSec`, `employee`, `contactLabel`, `disposition`
(`connected` | `no-answer`), and `transcript`. A connected call receives one observation per rubric
criterion: `status` (`met` | `partial` | `missed` | `not-applicable`), confidence `0..1`, a short
source quote or `null`, and a note. Extracted facts include the stated need, key parameters and the
next action with owner/due date when present. Summary facts are shown only when the corresponding
effective criterion is `met` or `partial`. A next action additionally needs an evidence quote that
overlaps the grounded `next-step` observation; unsupported facts are suppressed and warned, and a
non-ISO due date is discarded.

Versioned rubric `procurement-v1` totals 100 points:

| Criterion | Weight |
|---|---:|
| Greeting and identity | 10 |
| Purpose explained | 10 |
| Need or object clarified | 15 |
| Key parameters collected | 15 |
| Price and terms discussed | 15 |
| Timing and decision process clarified | 10 |
| Questions or objections handled | 10 |
| Concrete next step agreed | 10 |
| Summary and courteous close | 5 |

Scoring is code-only: `met = 1`, `partial = 0.5`, `missed = 0`; `not-applicable` is removed from the
denominator; final score = rounded `100 * earned applicable weight / applicable weight`. A `met` or
`partial` observation without an evidence quote is downgraded to `missed` and warned. Confidence
below `0.70` does not change the score but requires human review. Bands: `>=85` good, `70..84`
improve, `<70` review. No-answer attempts are counted in volume and duration but excluded from
quality averages.

Evidence may join adjacent turns while omitting the line-leading `Darbinieks:` / `Klients:`
labels. Matching still requires the exact spoken words in their original order, allowing only
whitespace normalization. Quotes with explicit speaker labels must match those labels; invented
amounts, incorrect speaker attribution and skipped intervening words must not be accepted.
The same treatment applies when checking overlap between next-action and criterion evidence.

Daily output: total/evaluated/connected/no-answer calls, total duration, average evaluated-call
duration, average score, score-band counts, per-criterion status rates, follow-ups and calls needing
review. Employee summaries show only that employee's calls, strengths, focus criteria and actions.
The manager summary shows team totals, per-employee rows, common omissions and a review queue; it
does not rank employees.

For a newly pasted transcript, `POST /api/analyze-call` may use a model to return grounded
observations in the fixed schema. The browser sends transcript text, never audio; the API accepts at
most 100 KB, rate-limits best-effort and returns a clear 503 when no key is configured. The model
cannot decide scores or personnel actions. Production use additionally requires an approved rubric,
recording notice/legal basis, role-based access, retention rules, EU-region/vendor review, an appeal
path and regular human calibration.

Synthetic oracle `samples/expected/calls-demo.json`: five attempts with durations
`360/240/20/300/180` seconds, four connected/evaluated calls scoring `90/60/80/100`. Expected day:
five calls, four evaluated, total duration `18:20`, average evaluated duration `4:30`, average score
`82.5`, two good / one improve / one review, and two calls requiring human review (one low score,
one low-confidence observation).

Calls `call-a1` and `call-a2` are also downloadable UTF-8 `.txt` files containing the original
speaker-labelled transcripts, with no cached assessments inside. The page explains that this is a
written conversation and guides the user through download, upload and analysis. A shortcut inserts
the same transcript and its sample metadata into the form without making a model request. A new
analysis is added to the visible day; its model-assigned statuses may differ from the cached oracle.

TXT file selection and drag-and-drop share the same reader. Reject non-TXT, empty and oversized
files before analysis while preserving any previously entered transcript. A file drop must not
navigate the browser away from the form.

### Task 3 — MP3 transcription extension (2026-09-06)

Accept one TXT or MP3 through the same picker and drop area. TXT remains a local reader. MP3 is
limited to 3,200,000 bytes and 10 minutes; reject empty, malformed and oversized files before a paid
request. The server reads duration from MPEG metadata, never from a model. A JSON/base64 upload
stays below the Vercel 4.5 MB request-body limit. The API key stays on the server.

`POST /api/transcribe-call` sends valid MP3 audio to an audio-capable OpenRouter model and returns
speaker-labelled text plus the measured duration. Preserve hesitations, corrected numbers and
background speech; uncertain words use `[neskaidrs]` and uncertain speakers use `Nezināms:`.
The user reviews/edits the transcript before explicitly requesting the existing text-only analysis.
Do not silently analyze old text when a newly selected MP3 has not been transcribed. A failure keeps
both the selected audio and any previous text available for retry. Do not log or persist audio or
transcript contents. Rate-limit transcription separately (5/minute, best-effort memory).

Offer playback of the selected MP3, download of the current editable transcript, and the owned
`samples/calls/sintetisks-zvans-ar-partraukumu.mp3` / `.txt` pair as test downloads. The MP3 must
be processed as actual uploaded audio; never substitute its source script or a cached transcript.
The existing two TXT samples and deterministic call-day oracle remain available and unchanged.

## Oracle A — private real sample (git-ignored)

Red-first checks. Numbers below are for `samples/private/inventory-client.pdf`
(`samples/private/expected-inventory-client.json` is the machine-readable form). These files
exist only on Kirill's machine; tests that use them **skip** when the files are absent, so the public
repo stays green without them. The identifiers inside are the client's — tests read them from the
JSON, never copy them into tracked source.

1. **Parse**: 11 stand rows (1,3,4,5,7,8,9,10,11,12 + row 2 non-forest "Meža dzīvnieku barošanas
   lauce"), property / land unit / parish as in the private JSON, year 2026, quarter 3,
   totals 6,65 ha / forest 6,33 ha. Stand 1 formula = `4Ba3B37 2Ba26 1A47` (two text lines merged),
   stand 1 flag `protection-zone` with text starting `40022000 Aizsargjoslas`.
2. **Eligibility** (both editions): eligible = {1, 3, 4, 7, 8, 12}; not eligible = {5, 9, 10, 11};
   not assessed = {2}. Traces: 1/3/8 by Ba exception; 4 and 7 by age (73 ≥ 71); 12 by age (56 ≥ 41);
   5: 47 < 71 and 17 < 25; 9: 22 < 41; 10: 42 < 81 and 19 < 31; 11: 12 < 41.
3. **Volumes** (m³): 1 → 331.1; 3 → 127.2; 4 → 66.98; 7 → 339.81; 8 → 105; 12 → 68.85; total 1038.94.
   Without flagged stand 1: 707.84.
4. **Species totals** (m³, ±0.01): E 33.981; B 498.555; A 102.305; Ba 391.379; Bl 12.72 → Citi.
5. **Finance**: revenue 56 322 ± 1 EUR (employer's Excel: 56 322.14); costs 24 934.56 exact
   (11 428.34 + 7 272.58 + 6 233.64); profit 3 138.7 ± 0.2; max purchase within [28 248.5, 28 249.5]
   → headline `28 249 EUR`; `27.19 EUR/m3`. Row checks: Finieris A ≈ 3 739.2, ZB ≈ 3 335.96,
   Tara ≈ 14 153.8, PM ≈ 7 243.3, Malka ≈ 14 729 (±1).
6. **Report headline** equals the four `headlineLines` of the private JSON (with `Bl=13 m3`).
7. **Warnings on the sample**: `protection-zone` on stand 1 with alternative totals; matrix Oz/Os
   column = 70 %; edition note (no stands flip between editions for this PDF). No coefficient-sum
   warning (all formulas sum to 10).
8. **Synthetic rule tests**: Priede, III, age 60, d 28 → `current-2024`: not eligible (needs 30);
   `task-pre-2022`: eligible (27). Bērzs, IV, age 52 → eligible by age (51). Formula `10E` → E 100 %.
   Formula `3P3E3B` (sums to 9) → warning, shares 0.3/0.3/0.3. Unknown code `7Xx3B40` → warning, Xx→Citi.
   Stand with no formula → not assessed. Multi-quarter synthetic text → stands grouped by quarter.
9. **Task 2 deterministic**: validation on mocked extraction results (missing price → error; dates out
   of order → error; bad cadastre → warning; confidence 0.5 → needsReview); synthetic contract text
   extraction (no LLM) contains the known values; summary renders all sections.
10. **Task 2 live** (skipped without `OPENROUTER_API_KEY`): synthetic contract → ≥ 90 % of known
    fields extracted with matching values; result cached to `samples/expected/*.extracted.json`.
11. **Build/gates**: `npm run typecheck`, `npm test`, `npm run build` green; `npx tsx cli/forest-report.ts
    samples/inventory-paraugmezs.pdf` prints the synthetic headline (Oracle B).

## Oracle B — public synthetic sample (always runs)

`samples/expected/inventory-paraugmezs.json` defines 8 stands of a fictional property "Paraugmežs"
(land unit `00000000042`, quarter 1, 5,00 ha / forest 4,70 ha) and the hand-computed expectations.
`scripts/make-synthetic-inventory.tsx` renders `samples/inventory-paraugmezs.pdf` in the VMD layout
from that JSON (the `generatorNotes` say what must wrap and which note lines to emit); the parser must
read the generated PDF back into the same stands.

1. **Eligibility** (`current-2024`): eligible {2, 3, 5, 7, 8}; not {1, 6}; not assessed {4}. Traces:
   1 — `P, III: vecums 95 < 101; caurmērs 28 < 30`; 2 — `B, I: vecums 75 ≥ 71`; 3 — `Oz, II: vecums
   125 ≥ 121`; 5 — Ba exception; 6 — `P, II: vecums 60 < 101; caurmērs 25 < 31` plus coefficient-sum
   warning (9); 7 — `E, Ia: vecums 85 ≥ 81`; 8 — `A, IV: vecums 45 ≥ 41`. Under `task-pre-2022` stand 1
   flips to eligible (`caurmērs 28 ≥ 27`) → `flipsBetweenEditions = [1]`.
2. **Volumes** (m³): 2 → 184; 3 → 150; 5 → 171; 7 → 144; 8 → 40; total 689; without flagged stand 5:
   518. Under `task-pre-2022`: +336 (stand 1) → 1025.
3. **Species totals**: E 149.4; B 253.9; A 93.9; Ba 86.8; Oz 75; Os 30 (matrix column Oz/Os = 105).
4. **Finance** (default matrix, ±0.05 per row, ±0.5 on totals): revenue by column E 11 937.06,
   B 16 198.82, A 5 051.82, Ba 3 506.72, Oz/Os 5 880 → revenue 42 574.42; unpriced Oz/Os volume
   31.5 m³; costs 7 579 + 4 823 + 4 134 = 16 536; profit 2 603.84; max purchase 23 434.58 →
   headline `23 435 EUR`, `34.01 EUR/m3`.
5. **Headline lines** exactly as in §Final report above.
6. **Warnings**: `protection-zone` (stand 5, alternative total 518); `coefficient-sum` (stand 6, 9);
   `matrix-column-sum` (Oz/Os 70 %, 31.5 m³ unpriced, hint Kamīnmalka); `edition-note` (stand 1 flips).
7. **Parse of the generated PDF**: 8 rows, stand 4 non-forest "Pļava", stand 5 formula wrapped across
   two lines and merged, protection note attached to stand 5, note lines of stand 2 attached to stand 2,
   footer totals 5,00 / 4,70.

## Oracle C — synthetic call day (always runs)

1. All four connected samples retain their fixed scores `90/60/80/100`; the no-answer attempt has
   `score = null` and no criterion results.
2. A `partial` criterion earns half its weight; a `not-applicable` criterion changes the denominator;
   a positive status without evidence is downgraded and warned. Unsupported summary facts and
   follow-ups are not exposed as confirmed data.
3. Day totals equal five attempts, four evaluated, 1 100 seconds total, 270 seconds average evaluated
   duration and 82.5 average quality. Quality bands are 2/1/1 and the review queue has two calls.
4. The employee summary includes that employee's follow-ups and focus criteria. The manager summary
   includes team volume, common omissions and review calls without ranking employees.
5. `/zvani` loads the cached day without a key, drills into criterion evidence and exposes employee
   and manager summaries plus JSON/copy/mailto actions.
6. MP3 validation rejects bad encoding, non-MPEG data, excessive bytes/duration and missing server
   configuration without a model call. A valid owned MP3 returns measured duration and labelled text;
   empty model output or upstream failure gives a clear retryable error without exposing raw content.
7. Picker and drop both accept MP3. Transcription fills editable text without changing day metrics;
   only the subsequent analysis sends that reviewed text and adds a call. TXT upload still works,
   and invalid replacement files or failed transcription preserve the existing input.

## Rules ← Sources

- Main felling age table ← Meža likums, 9. pants — https://likumi.lv/ta/id/2825-meza-likums
- Diameter table (two editions) ← MK noteikumi Nr. 935, 7. pielikums — https://likumi.lv/ta/id/253760-noteikumi-par-koku-cirsanu-meza ; Constitutional Court ruling 08.04.2024 (values reduced by the 29.06.2022 amendment void from 30.06.2022; increased Priede/Bērzs III values remain) — https://lvportals.lv/dienaskartiba/362891-caurmera-cirsu-kriteriji-pec-satversmes-tiesas-08-04-2024-sprieduma-2024 ; the assignment's table = pre-29.06.2022 edition (ours: research synthesis, docs/research/research.md §Нормативка)
- "Age OR diameter" ← MK 935 §9 (research, single fetch — verify in the morning)
- Baltalksnis always eligible ← assignment text (employer's rule; not found in law text)
- Composition formula grammar, tenths sum to 10 ← assignment example + LLKC material (ours where the sources are silent: `+X` admixture handling, dominant = max share)
- Species codes ← LLKC "Mežsaimniecības pamati" (medium trust) + assignment; unverified codes marked
- Assortment matrix shares/prices, cost rates 11/7/6, profit 10 % ← employer's example (ours: editable defaults)
- Rounding policy ← ours (Kirill/Claude 2026-09-04): full precision, display rounding
- Protection zone = flag, not exclusion ← ours (Kirill 2026-09-04); legal basis for the flag: Aizsargjoslu likums / MK 935 restrictions (not fetched — open question)
- Contract schema ← ours, informed by CUAD categories (https://arxiv.org/pdf/2103.06268) and the employer's list (parties, amounts, terms, special conditions); field = value+confidence+quote ← LlamaExtract/Reducto pattern (research §Продукты)
- Registration number 11 digits / personas kods formats / cadastre 11 digits ← format-only (ours; checksums not public); IBAN ← ISO 13616 via `ibantools`
- Vercel limits (4.5 MB body, 300 s) ← https://vercel.com/docs/errors/FUNCTION_PAYLOAD_TOO_LARGE and Vercel docs (research, verified 2026-09-04)
- Synthetic sample design (stands, edge cases, expected numbers) ← ours (Claude, 2026-09-04), hand-computed in `samples/expected/inventory-paraugmezs.json`

## Pre-mortem

- **What we don't know:** whether `current-2024` diameter values are pixel-exact (likumi.lv renders
  the table as an image; two text fetches agreed) — morning eyeball; species codes for Liepa/Goba/
  Vīksna/Kļava; whether every registry PDF wraps formulas the same way; which OpenRouter models
  honour strict JSON schema today; whether the employer's `Bl=12` is a slip or a truncation rule.
- **What breaks first:** (1) pdf.js worker in Vite — pin `workerSrc` via `?url` import, test in
  `npm run build` preview; (2) multi-line formula merge (stand 1) — parser test is red until solved;
  (3) ligature glyphs — replacement table from the sample, test on `daƟ→dati`; (4) borderless table
  column detection — cluster text items by y then x, calibrate on header positions, fall back to
  whitespace splitting with known column count; (5) `generateObject` failures on cheap models —
  response healing, one retry, then `needsReview` with raw text; (6) executor sandbox without network — step 0 verifies `npm view` first and stops with
  `docs/waiting.md` if blocked; (7) the synthetic PDF generator producing a layout "easier" than the
  real form, so public tests pass while the real PDF fails — the private oracle exists for exactly
  this and runs on Kirill's machine before the morning deploy.
- **How we roll back:** the repo is standalone — delete the folder; nothing touches wedding-quiz.
  Every step is a commit; a broken step is reverted by Kirill in the morning, oracle tests show where.
- **How strong teams do this — and what stops us:** they integrate the registry API/open data instead
  of PDFs (Finland's Metsään.fi since 2018) and keep a human-in-the-loop review queue with grounding
  for contract extraction. VMD has open bulk data (quarterly SHP, CC0) but no per-cadastre endpoint
  we could find — PDF stays the input; the review-queue pattern is what our `needsReview` flag
  imitates in one page.

## Open Questions

- Morning: eyeball MK 935 7. pielikums on likumi.lv against the `current-2024` table.
- Domain: is the assignment's Oz/Os 70 % column a slip (Kamīnmalka share missing) or intentional? Ask
  the client politely in the e-mail; the app warns either way.
- Hosting: Vercel account + the Caddy `handle_path /forest/*` line in wedding-quiz
  `caddy/sites/sokolov.caddy` (hand-applied on the VPS, committed with the next batch) — Kirill, morning.
- Whether to keep docs/decisions.ru.md in the public repo after `DECISIONS.md` (LV) exists.

## Next Steps

→ `PLAN.md` (night plan for Sol, step-by-step with verification) · morning: acceptance review,
Vercel deploy, screen recording, e-mail (draft `docs/email.lv.md`).

## Screens (click-map, Latvian labels)

1. `/` — hero: "Meža inventarizācijas, līgumu un zvanu procesu automatizācija — demo";
   three-step "Kā tas strādā"; three cards → `/mezs`, `/ligumi`, `/zvani`; link "Lēmumi" →
   `/lemumi`; footer: GitHub, author.
2. `/mezs` — dropzone (PDF) + "Izmantot paraugu (Paraugmežs)"; then five panels top-to-bottom:
   Nolasītie nogabali (table, parse status) → Kailcirtes atlase (verdict + trace per stand, flags,
   edition toggle `Spēkā esošā (2024) / Uzdevuma (līdz 29.06.2022)`, "iekļaut" checkbox on flagged)
   → Apjoms un sugas → Sortimenti un izmaksas (editable matrix, cost rates, profit %) → Gala
   atskaite (headline block exactly as the assignment, extended sections, Brīdinājumi with anchors
   to inputs, buttons: Kopēt, .txt, .json, .docx). Alternative totals without flagged stands shown
   next to the headline.
3. `/ligumi` — dropzone + sample picker (7 templates + synthetic); "Izvilkt datus" → progress →
   fields table (value · uzticamība · citāts · statuss), issues list, e-mail summary textarea +
   "Atvērt e-pastā" + Kopēt, JSON download; badge "no kešatmiņas" when serving cached results.
4. `/lemumi` — DECISIONS.md rendered: title, one-paragraph intro, numbered decisions (decision ·
   why · what it gives), readable typography, no jargon.
5. `/zvani` — transcript input + synthetic sample day; per-call score and grounded rubric table;
   employee and manager day summaries; copy, mailto and JSON actions; process, implementation and
   measurement plan linked or rendered on the page.

## Test scenarios (for the morning manual check)

- Public sample (Paraugmežs) → headline 689 m³ / 23 435 EUR / 34.01 EUR/m³; four warnings listed.
- Upload the client's real PDF (local only) → 1039 / 28 249 / 27.19; Bl shows 13.
- Toggle edition → stand 1 flips to eligible, total becomes 1 025 m³, the note names the stand.
- Uncheck "iekļaut" on stand 5 → total drops to 518 m³ and the report says which stand is excluded.
- Fill 30 % into Oz/Os Kamīnmalka → warning disappears; revenue grows by 31.5 × 50 = 1 575 EUR.
- Set ciršana to 12 → max purchase drops by 689 × 0.9 = 620.1 EUR (profit is 10 % of the margin).
- Upload a non-PDF / image-only PDF → clear message, no crash, manual path hint.
- Contracts: synthetic → fields filled, few issues; a blank template → many `needsReview` flags;
  without API key → cached results badge; mailto opens with LV subject/body.
- Calls: cached day → `5` calls, `18:20` total, `82.5` average; open the 60-point call to see missing
  price/timing/next step/close; the 100-point low-confidence call remains scored 100 but is queued
  for review; employee and manager summaries contain different levels of detail.
