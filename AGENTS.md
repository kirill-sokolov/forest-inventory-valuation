# AGENTS.md — working rules for the executor (Sol / codex CLI)

You are building a one-day prototype for a hiring assignment. Read `docs/spec.md` fully before
writing code, then follow `PLAN.md` step by step. The spec is the source of truth for domain rules
and the oracle; the plan is the order of work and the definition of done for each step.

## Stack (fixed — do not swap)

- Node 24, TypeScript strict, npm. Single package at the repo root.
- Web: Vite + React 19 + Tailwind CSS v4. Routing: `react-router`. No state library, no i18n framework.
- Tests: vitest (+ `@testing-library/react` for a few component tests). Types: `tsc --noEmit`. Lint: Biome.
- PDF text: `pdfjs-dist` in the browser (worker via `?url` import, `workerSrc` pinned); `unpdf` in Node
  (tests, CLI, serverless). Shared normalization module (ligatures, NFKC, decimal comma).
- LLM: `ai` (Vercel AI SDK) + `@openrouter/ai-sdk-provider` + `zod` v4. Only in `api/` and `engine/contracts/`.
- Serverless: Vercel functions in `api/` (`OPENROUTER_API_KEY` from env). No DB, no auth, no docker.
- Exports: `docx` for .docx; `@react-pdf/renderer` only if a step asks for PDF export.

## Repo layout

```
engine/      pure TypeScript, no DOM, no network: pdf text normalization, inventory parser,
             formula, rules (law tables as data with editions), calc, report, contracts schema/validation/summary
cli/         forest-report.ts (PDF → report), contract-extract.ts (PDF → JSON, needs key)
src/         Vite React app (base /forest/): pages /, /mezs, /ligumi, /lemumi; components; hooks
api/         Vercel functions: extract.ts (contract text → JSON), optional parse-inventory.ts
samples/     inventory-paraugmezs.pdf (public synthetic, generated) + expected/*.json (oracle B);
             private/ (git-ignored: the client's real PDF + oracle A — tests skip when absent);
             contracts/ (synthetic-*.pdf committed; third-party/ git-ignored, SOURCES.md + fetch script)
scripts/     helper scripts (fetch samples, pick model, generate synthetic contract)
docs/        spec.md, decisions.ru.md (draft, RU), research/ + task/ (git-ignored), waiting.md, NIGHT-REPORT.md
DECISIONS.md Latvian, manager-facing; rendered at /lemumi
```

## How to work

- **Oracle first.** For each step write the red tests from `docs/spec.md` §Oracle, then make them green.
  Never edit expected values in `samples/expected/` to make a test pass. If you believe an expectation is
  wrong, write it in `docs/waiting.md` with your reasoning and keep the test red.
- **Verification is a command, not a feeling.** A step is done only when its Verification command in
  `PLAN.md` exits 0. Then commit: `feat|fix|test|docs|chore(<area>): <summary>`. One step → one or a few commits.
- **Two failures rule.** If a step's verification fails twice after honest attempts, mark the step
  `BLOCKED — <reason>` in `PLAN.md`, write `docs/waiting.md`, and continue with the next step that does
  not depend on it. Do not loop.
- **Never wait for input.** Nobody is watching. Make a reasonable assumption, write it down in
  `docs/waiting.md` (what, why, where the stub is), and move on.
- **No proactive escalation.** This repository runs with Full Access. Run in-repository commands,
  including `git add` and `git commit`, directly. Never set `sandbox_permissions = "require_escalated"`
  preemptively; request escalation only after a command actually fails with a permission or sandbox error.
- **Deterministic numbers.** Every number shown for task 1 comes from `engine/` code. LLM output is
  never a source of numbers (vision fallback, if reached, is cross-checked and labelled).
- **Keep it small.** No abstractions for hypothetical futures, no config systems, no plugin layers.
  Pure functions with explicit types; small files; no `any`; no `// @ts-ignore`.
- **Language.** UI strings, report, e-mail draft, `DECISIONS.md` — Latvian. Code, comments, README,
  commit messages, `PLAN.md` status notes — English. Do not add Russian text to tracked files.
- **Anonymization.** The client is "pasūtītājs" / "the client" everywhere. Never write the client's
  company name, its real cadastre numbers, property or parish names into tracked files — they exist only
  under `samples/private/` and `docs/task/` (both git-ignored). Tests that need the private files read
  them from `samples/private/*.json` and skip when absent.
- **Base path.** The site lives at `https://sokolov.lv/forest/` behind a reverse proxy: build with
  `base: '/forest/'`, router basename `/forest`, API URLs from `import.meta.env.BASE_URL`; never
  hard-code `/api/...` or `/assets/...`.
- **Secrets.** `OPENROUTER_API_KEY` only from `.env.local` / Vercel env. Never commit it, never print it.
  Live LLM tests skip when the key is missing (they must not fail).
- **Network.** Step 0 checks that npm and HTTPS work from the sandbox. If not, write `docs/waiting.md`
  and stop — nothing else can proceed.
- **Docs.** `README.md` (EN) is updated when the run instructions change. `DECISIONS.md` (LV) gets a new
  entry only for decisions a manager would care about (why parser-first, why tables are versioned, why
  warnings not blocking). Plain language, no jargon, no step numbers.
- **End of night.** Update `PLAN.md` step statuses (`DONE` / `BLOCKED` / `SKIPPED`), write
  `docs/NIGHT-REPORT.md` (what works, what does not, how to verify in 5 minutes, open questions), commit.

## Do not

- Add authentication, users, databases, background jobs, docker, CI pipelines, analytics.
- Send the PDF to the server (send extracted text; Vercel body limit is 4.5 MB).
- Call paid APIs from tests without the key guard.
- Rewrite the spec's domain rules from memory — cite `docs/spec.md` sections in code comments where a rule is implemented.
- Touch anything outside this repository.
