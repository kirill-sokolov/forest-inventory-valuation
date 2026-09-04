import { useMemo, useState } from "react";
import { Link } from "react-router";

import { aggregateCallDay } from "../../engine/calls/aggregate";
import {
  createEmployeeDaySummary,
  createManagerDaySummary,
  serializeCallDay,
} from "../../engine/calls/report";
import { PROCUREMENT_CALL_RUBRIC } from "../../engine/calls/rubric";
import { analyzeCall } from "../../engine/calls/score";
import type {
  AnalyzedCall,
  CallDemoFixture,
  CallExtraction,
  CallRecord,
  CallScoreBand,
  CriterionId,
  ObservationStatus,
} from "../../engine/calls/types";
import callFixture from "../../samples/expected/calls-demo.json";
import { downloadText } from "../lib/download";

const demo = callFixture as unknown as CallDemoFixture;

const criterionLabels: Record<CriterionId, string> = {
  "greeting-identity": "Sasveicināšanās un iepazīstināšana",
  purpose: "Zvana mērķis",
  "need-object": "Vajadzība vai objekts",
  "key-parameters": "Galvenie parametri",
  "price-terms": "Cena un nosacījumi",
  "timing-decision": "Termiņš un lēmuma process",
  "questions-objections": "Jautājumi un iebildumi",
  "next-step": "Konkrēts nākamais solis",
  "summary-close": "Kopsavilkums un noslēgums",
};

const statusLabels: Record<ObservationStatus, string> = {
  met: "Izpildīts",
  partial: "Daļēji izpildīts",
  missed: "Nav izpildīts",
  "not-applicable": "Nav piemērojams",
};

const bandLabels: Record<CallScoreBand, string> = {
  good: "Labs",
  improve: "Pilnveidojams",
  review: "Jāpārbauda",
};

const bandStyles: Record<CallScoreBand, string> = {
  good: "bg-emerald-100 text-emerald-900",
  improve: "bg-amber-100 text-amber-950",
  review: "bg-rose-100 text-rose-900",
};

const warningLabels: Record<string, string> = {
  "low-confidence": "Zema uzticamība — secinājums jāpārbauda cilvēkam.",
  "missing-evidence": "Pozitīvam vērtējumam trūkst avota citāta.",
  "quote-not-found": "Avota citāts nav atrodams transkriptā.",
  "ungrounded-fact": "Iegūtais fakts nav pietiekami pamatots ar rubrikas citātu.",
  "missing-observation": "Kritērijam nav saņemts novērojums.",
  "rubric-version": "Analīzei ir neatbilstoša rubrikas versija.",
  "duplicate-observation": "Kritērijs analīzē atkārtojas.",
};

function createDemoAnalyses(): AnalyzedCall[] {
  return demo.calls.map((call) => analyzeCall(call, call.extraction));
}

function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

function formatOptionalDuration(seconds: number | null): string {
  return seconds === null ? "—" : formatDuration(seconds);
}

function formatDecimal(value: number | null): string {
  if (value === null) return "—";
  return value.toLocaleString("lv-LV", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 1,
    maximumFractionDigits: 1,
  });
}

function formatTime(value: string): string {
  return new Intl.DateTimeFormat("lv-LV", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function apiEndpoint(): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}api/analyze-call`;
}

function isCallExtraction(value: unknown): value is CallExtraction {
  return (
    typeof value === "object" &&
    value !== null &&
    "rubricVersion" in value &&
    value.rubricVersion === PROCUREMENT_CALL_RUBRIC.version &&
    "observations" in value &&
    Array.isArray(value.observations) &&
    "facts" in value &&
    typeof value.facts === "object" &&
    value.facts !== null
  );
}

async function requestCallExtraction(record: CallRecord): Promise<CallExtraction> {
  const response = await fetch(apiEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      transcript: record.transcript,
      metadata: {
        startedAt: record.startedAt,
      },
    }),
  });
  const payload = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "message" in payload &&
      typeof payload.message === "string"
        ? payload.message
        : "Transkripta analīze neizdevās.";
    throw new Error(message);
  }
  if (!isCallExtraction(payload)) {
    throw new Error("Serveris atgrieza neatpazīstamu analīzes rezultātu.");
  }
  return payload;
}

function CallBadge({ call }: { call: AnalyzedCall }) {
  if (call.score === null || call.band === null) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
        Neatbildēts
      </span>
    );
  }
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${bandStyles[call.band]}`}>
      {call.score} · {bandLabels[call.band]}
    </span>
  );
}

function CallDetails({ call }: { call: AnalyzedCall }) {
  const nextAction = call.facts?.nextAction;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7"
      aria-labelledby="call-details-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-emerald-700">Viena zvana pārskats</p>
          <h2 id="call-details-heading" className="mt-1 text-2xl font-bold tracking-tight">
            {call.contactLabel}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {call.employee} · {formatTime(call.startedAt)} · {formatDuration(call.durationSec)}
          </p>
        </div>
        {call.score === null ? (
          <div className="rounded-xl bg-slate-100 px-5 py-3 text-lg font-bold text-slate-700">
            Netiek vērtēts
          </div>
        ) : (
          <div className="text-right">
            <div className="text-3xl font-black tracking-tight text-emerald-900">
              {call.score} / 100
            </div>
            {call.band && (
              <span
                className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${bandStyles[call.band]}`}
              >
                {bandLabels[call.band]}
              </span>
            )}
          </div>
        )}
      </div>

      {call.score === null ? (
        <p className="mt-6 rounded-xl bg-slate-50 p-4 text-slate-700">
          Neatbildēts mēģinājums ir iekļauts zvanu skaitā un ilgumā, bet ne kvalitātes vidējā.
        </p>
      ) : (
        <>
          {call.needsReview && (
            <aside
              className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4"
              aria-label="Pārbaudes brīdinājumi"
            >
              <h3 className="font-bold text-amber-950">Nepieciešama cilvēka pārbaude</h3>
              {call.warnings.length > 0 ? (
                <ul className="mt-2 space-y-1 text-sm text-amber-950">
                  {call.warnings.map((warning) => (
                    <li key={`${warning.code}-${warning.criterionId ?? warning.message}`}>
                      {warningLabels[warning.code] ?? warning.message}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-amber-950">
                  Vērtējums ir zem 70 punktiem; pirms atgriezeniskās saites pārbaudiet transkriptu.
                </p>
              )}
            </aside>
          )}

          <div className="mt-6 overflow-x-auto rounded-xl border border-slate-200">
            <table
              className="w-full min-w-[840px] divide-y divide-slate-200 text-left text-sm"
              aria-label="Vērtēšanas kritēriji"
            >
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">Kritērijs</th>
                  <th className="px-4 py-3 font-semibold">Svars</th>
                  <th className="px-4 py-3 font-semibold">Statuss</th>
                  <th className="px-4 py-3 font-semibold">Uzticamība</th>
                  <th className="px-4 py-3 font-semibold">Avota citāts un pamatojums</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {call.criteria.map((criterion) => (
                  <tr key={criterion.criterionId}>
                    <th className="px-4 py-3 font-semibold text-slate-900">
                      {criterionLabels[criterion.criterionId]}
                    </th>
                    <td className="px-4 py-3 text-slate-600">
                      {criterion.earnedWeight.toLocaleString("lv-LV")} / {criterion.weight}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{statusLabels[criterion.status]}</span>
                    </td>
                    <td className="px-4 py-3 tabular-nums text-slate-600">
                      {criterion.confidence === null
                        ? "—"
                        : `${Math.round(criterion.confidence * 100)} %`}
                    </td>
                    <td className="max-w-md px-4 py-3 text-slate-600">
                      {criterion.evidenceQuote ? (
                        <blockquote className="m-0 border-l-2 border-emerald-300 pl-3 text-slate-800">
                          “{criterion.evidenceQuote}”
                        </blockquote>
                      ) : (
                        <span className="text-slate-400">Citāts nav atrasts</span>
                      )}
                      <p className="mb-0 mt-1 text-xs leading-5 text-slate-500">{criterion.note}</p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-emerald-50 p-4">
              <h3 className="font-bold text-emerald-950">Sarunā noskaidrots</h3>
              <p className="mt-1 text-xs leading-5 text-emerald-900">
                Modeļa strukturēti lauki; pārbaudiet tos pret rubrikas citātiem.
              </p>
              <dl className="mt-3 space-y-3 text-sm">
                <div>
                  <dt className="font-semibold text-emerald-900">Vajadzība</dt>
                  <dd className="mt-0.5 text-slate-700">{call.facts?.need ?? "Nav atrasta"}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-emerald-900">Galvenie parametri</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {call.facts?.keyParameters.length
                      ? call.facts.keyParameters.join(" · ")
                      : "Nav atrasti"}
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold text-emerald-900">Cena un nosacījumi</dt>
                  <dd className="mt-0.5 text-slate-700">
                    {call.facts?.priceTerms ?? "Nav atrasti"}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="rounded-xl bg-sky-50 p-4">
              <h3 className="font-bold text-sky-950">Turpmākā darbība</h3>
              {nextAction ? (
                <dl className="mt-3 space-y-2 text-sm text-slate-700">
                  <div>
                    <dt className="font-semibold text-sky-900">Darbība</dt>
                    <dd>{nextAction.action}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-sky-900">Atbildīgais un termiņš</dt>
                    <dd>
                      {nextAction.owner}
                      {nextAction.dueAt ? ` · ${nextAction.dueAt}` : " · termiņš jāprecizē"}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-3 text-sm text-slate-700">Konkrēts nākamais solis nav sarunāts.</p>
              )}
            </div>
          </div>

          <details className="mt-5 rounded-xl border border-slate-200 p-4">
            <summary className="cursor-pointer font-semibold">Rādīt transkriptu</summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {call.transcript}
            </pre>
          </details>
        </>
      )}
    </section>
  );
}

export function CallsPage() {
  const [analyses, setAnalyses] = useState<AnalyzedCall[]>(createDemoAnalyses);
  const [selectedCallId, setSelectedCallId] = useState(demo.calls[0]?.id ?? "");
  const [recipient, setRecipient] = useState("manager");
  const [transcript, setTranscript] = useState("");
  const [employee, setEmployee] = useState("Darbinieks C");
  const [contactLabel, setContactLabel] = useState("Kontakts 006");
  const [startedAt, setStartedAt] = useState(`${demo.date}T16:30`);
  const [durationSec, setDurationSec] = useState(240);
  const [disposition, setDisposition] = useState<CallRecord["disposition"]>("connected");
  const [textFileName, setTextFileName] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const day = useMemo(() => aggregateCallDay(demo.date, analyses), [analyses]);
  const selectedCall = analyses.find((call) => call.id === selectedCallId) ?? analyses[0];
  const summary = useMemo(
    () =>
      recipient === "manager"
        ? createManagerDaySummary(day)
        : createEmployeeDaySummary(day, recipient),
    [day, recipient],
  );
  const employees = day.employees.map((item) => item.employee);
  const mailto = `mailto:?subject=${encodeURIComponent(`Zvanu kopsavilkums · ${demo.date}`)}&body=${encodeURIComponent(summary)}`;

  function resetDemo(): void {
    const next = createDemoAnalyses();
    setAnalyses(next);
    setSelectedCallId(next[0]?.id ?? "");
    setRecipient("manager");
    setError("");
    setCopied(false);
  }

  async function readTextFile(file: File): Promise<void> {
    setError("");
    if (file.size > 100_000) {
      setError("Transkripta fails pārsniedz 100 KB ierobežojumu.");
      return;
    }
    try {
      setTranscript(await file.text());
      setTextFileName(file.name);
    } catch {
      setError("Transkripta failu neizdevās nolasīt.");
    }
  }

  async function analyzeTranscript(): Promise<void> {
    setError("");
    setCopied(false);
    if (!employee.trim() || !contactLabel.trim() || !startedAt) {
      setError("Aizpildiet darbinieku, kontakta apzīmējumu un zvana laiku.");
      return;
    }
    if (disposition === "connected" && !transcript.trim()) {
      setError("Ielīmējiet transkriptu vai izvēlieties .txt failu.");
      return;
    }
    if (new TextEncoder().encode(transcript).byteLength > 100_000) {
      setError("Transkripts pārsniedz 100 KB ierobežojumu.");
      return;
    }

    const record: CallRecord = {
      id: `manual-${Date.now()}`,
      startedAt: new Date(startedAt).toISOString(),
      durationSec,
      employee: employee.trim(),
      contactLabel: contactLabel.trim(),
      disposition,
      transcript: disposition === "connected" ? transcript.trim() : "",
    };

    setIsLoading(true);
    try {
      const extraction = disposition === "connected" ? await requestCallExtraction(record) : null;
      const analysis = analyzeCall(record, extraction);
      setAnalyses((current) => [...current, analysis]);
      setSelectedCallId(record.id);
      setRecipient("manager");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Transkripta analīze neizdevās.");
    } finally {
      setIsLoading(false);
    }
  }

  async function copySummary(): Promise<void> {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
    } catch {
      setError("Kopsavilkumu neizdevās nokopēt.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <header className="mb-8 max-w-4xl">
        <Link className="mb-8 inline-flex text-sm font-semibold text-emerald-800" to="/">
          ← Sākums
        </Link>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Zvana pārskats un dienas kopsavilkums
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
          Zvanu kvalitāte ar pārbaudāmiem pierādījumiem
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
          Valodas modelis drīkst atrast faktus un citātus. Punktus, kvalitātes grupas un dienas
          rādītājus vienmēr aprēķina kods pēc versētās rubrikas.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white"
            onClick={resetDemo}
          >
            Ielādēt parauga dienu
          </button>
          <a
            className="rounded-lg bg-emerald-50 px-4 py-2 font-semibold text-emerald-900"
            href="#procesa-plans"
          >
            Skatīt ieviešanas plānu
          </a>
        </div>
      </header>

      <section
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7"
        aria-labelledby="new-call-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Jauns zvans</p>
            <h2 id="new-call-heading" className="mt-1 text-2xl font-bold">
              Izvērtēt transkriptu
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Izmantojiet runātāju atzīmes “Darbinieks:” un “Klients:”. Pārlūks sūta tikai tekstu,
              nevis audio.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            Līdz 100 KB
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-sm font-semibold text-slate-700">
            Darbinieks
            <input
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              value={employee}
              onChange={(event) => setEmployee(event.target.value)}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Kontakta apzīmējums
            <input
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              value={contactLabel}
              onChange={(event) => setContactLabel(event.target.value)}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Sākuma laiks
            <input
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              type="datetime-local"
              value={startedAt}
              onChange={(event) => setStartedAt(event.target.value)}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Ilgums sekundēs
            <input
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 font-normal"
              type="number"
              min="0"
              value={durationSec}
              onChange={(event) => setDurationSec(Math.max(0, Number(event.target.value) || 0))}
            />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Iznākums
            <select
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-normal"
              value={disposition}
              onChange={(event) => setDisposition(event.target.value as CallRecord["disposition"])}
            >
              <option value="connected">Saruna notika</option>
              <option value="no-answer">Neatbildēja</option>
            </select>
          </label>
        </div>

        <label
          className="mt-5 block text-sm font-semibold text-slate-700"
          htmlFor="call-transcript"
        >
          Zvana transkripts
        </label>
        <textarea
          id="call-transcript"
          className="mt-1 min-h-52 w-full rounded-xl border border-slate-300 p-4 font-mono text-sm leading-6 disabled:bg-slate-100"
          disabled={disposition === "no-answer"}
          placeholder="Darbinieks: Labdien!...\nKlients: Labdien!..."
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
        />
        <aside className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm leading-6 text-sky-950">
          <strong>Datu robeža.</strong> Jauna transkripta teksts un zvana laiks tiek nosūtīts ārējam
          OpenRouter modelim. Šajā prototipā izmantojiet tikai sintētisku vai anonimizētu tekstu.
          Parauga diena modelim netiek sūtīta.
        </aside>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800">
            Izvēlēties .txt failu
            <input
              className="sr-only"
              type="file"
              accept="text/plain,.txt"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void readTextFile(file);
              }}
            />
          </label>
          {textFileName && <span className="text-sm text-slate-600">{textFileName}</span>}
          <button
            type="button"
            className="ml-auto rounded-lg bg-emerald-700 px-5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isLoading}
            onClick={() => void analyzeTranscript()}
          >
            {isLoading
              ? "Analizē..."
              : disposition === "connected"
                ? "Analizēt transkriptu"
                : "Pievienot mēģinājumu"}
          </button>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-800" role="alert">
            {error}
          </p>
        )}
      </section>

      <section className="mt-8" aria-labelledby="day-heading">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-700">Sintētiskā diena · {demo.date}</p>
            <h2 id="day-heading" className="mt-1 text-2xl font-bold">
              Dienas aina
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-slate-600">
            Pieci izdomāti mēģinājumi darbojas bez API atslēgas. Neatbildēts zvans neietekmē
            kvalitātes vidējo.
          </p>
        </div>
        <fieldset
          className="m-0 mt-4 grid gap-3 border-0 p-0 sm:grid-cols-2 lg:grid-cols-6"
          aria-label="Dienas rādītāji"
        >
          {[
            ["Zvanu mēģinājumi", String(day.callCount)],
            ["Izvērtēti", String(day.evaluatedCount)],
            ["Kopējais ilgums", formatDuration(day.totalDurationSec)],
            ["Vidējais ilgums", formatOptionalDuration(day.averageEvaluatedDurationSec)],
            ["Vidējā kvalitāte", formatDecimal(day.averageScore)],
            ["Jāpārbauda", String(day.reviewCallIds.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </span>
              <strong className="mt-2 block text-2xl tabular-nums text-slate-950">{value}</strong>
            </div>
          ))}
        </fieldset>
      </section>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
          aria-label="Dienas zvani"
        >
          <div className="px-2 pb-3 pt-2">
            <h2 className="font-bold">Zvani</h2>
            <p className="mt-1 text-xs text-slate-500">Atveriet kritērijus un avota citātus.</p>
          </div>
          <div className="space-y-2">
            {analyses.map((call) => (
              <button
                key={call.id}
                type="button"
                className={`w-full rounded-xl border p-3 text-left transition ${selectedCall?.id === call.id ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-emerald-300"}`}
                aria-pressed={selectedCall?.id === call.id}
                onClick={() => setSelectedCallId(call.id)}
              >
                <span className="flex items-center justify-between gap-2">
                  <strong className="text-sm">{call.contactLabel}</strong>
                  <CallBadge call={call} />
                </span>
                <span className="mt-2 block text-xs text-slate-500">
                  {call.employee} · {formatDuration(call.durationSec)}
                </span>
                {call.needsReview && (
                  <span className="mt-2 block text-xs font-bold text-amber-800">
                    Jāpārbauda cilvēkam
                  </span>
                )}
              </button>
            ))}
          </div>
        </aside>
        {selectedCall && <CallDetails call={selectedCall} />}
      </div>

      <section
        className="mt-8 rounded-2xl bg-emerald-950 p-5 text-emerald-50 shadow-sm lg:p-7"
        aria-labelledby="summary-heading"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-300">Atšķirīgi lomu skati</p>
            <h2 id="summary-heading" className="mt-1 text-2xl font-bold text-white">
              Dienas kopsavilkums
            </h2>
          </div>
          <label className="text-sm font-semibold text-emerald-100">
            Atskaites saņēmējs
            <select
              className="mt-1 block min-w-56 rounded-lg border border-emerald-700 bg-emerald-900 px-3 py-2 text-white"
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
            >
              <option value="manager">Vadītājs · komandas aina</option>
              {employees.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <section aria-label="Kopsavilkuma teksts">
          <pre className="mt-5 max-h-[34rem] overflow-auto whitespace-pre-wrap rounded-xl bg-black/15 p-4 text-sm leading-6 text-emerald-50">
            {summary}
          </pre>
        </section>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg bg-white/10 px-4 py-2 font-semibold text-white"
            onClick={() => void copySummary()}
          >
            Kopēt kopsavilkumu
          </button>
          <a className="rounded-lg bg-white/10 px-4 py-2 font-semibold text-white" href={mailto}>
            Atvērt e-pastā
          </a>
          <button
            type="button"
            className="rounded-lg bg-white/10 px-4 py-2 font-semibold text-white"
            onClick={() =>
              downloadText(
                `${serializeCallDay(day)}\n`,
                `zvanu-diena-${demo.date}.json`,
                "application/json;charset=utf-8",
              )
            }
          >
            Lejupielādēt JSON
          </button>
          {copied && (
            <span className="self-center text-sm text-emerald-200" role="status">
              Nokopēts.
            </span>
          )}
        </div>
      </section>

      <section
        id="procesa-plans"
        className="mt-8 scroll-mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:p-7"
        aria-labelledby="process-heading"
      >
        <p className="text-sm font-semibold text-emerald-700">No prototipa līdz pilotam</p>
        <h2 id="process-heading" className="mt-1 text-2xl font-bold">
          Process, ieviešana un mērīšana
        </h2>
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div>
            <h3 className="font-bold">Pēc katra zvana</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
              <li>Saņem metadatus un transkriptu ar nodalītiem runātājiem.</li>
              <li>Modelis piedāvā strukturētus novērojumus ar precīziem citātiem.</li>
              <li>Kods pārbauda pierādījumus, aprēķina punktus un veido pārbaudes rindu.</li>
              <li>Darbinieks saņem zvana pārskatu; dienas beigās top divi lomu skati.</li>
            </ol>
          </div>
          <div>
            <h3 className="font-bold">Ieviešanas secība</h3>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-600">
              <li>Apstiprināt rubriku, tiesisko pamatu, piekļuvi un glabāšanas termiņus.</li>
              <li>Kalibrēt 30–50 anonimizētus zvanus ar divu cilvēku etalonu.</li>
              <li>Divas nedēļas darbināt ēnas režīmā, pēc tam — kontrolētā četru nedēļu pilotā.</li>
              <li>Paplašināt tikai pēc kvalitātes, privātuma un laika ietaupījuma vārtiem.</li>
            </ol>
          </div>
          <div>
            <h3 className="font-bold">Pilota mērījumi</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
              <li>95 % pārskatu piecu minūšu laikā; tehniskas kļūdas ne vairāk kā 2 %.</li>
              <li>90 % citātu atbilst secinājumam; 85 % statusu sakrīt ar cilvēku etalonu.</li>
              <li>Neatklāti kritiskie izlaidumi ne vairāk kā 5 %.</li>
              <li>Vismaz 60 % mazāk laika klausīšanai un kopsavilkumiem.</li>
            </ul>
          </div>
        </div>
        <aside className="mt-6 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Cilvēka lēmums paliek obligāts.</strong> Prototips nevērtē personību vai emocijas
          un nepieņem atalgojuma vai disciplinārus lēmumus. Produkcijā vajadzīga informēšana, lomu
          piekļuve, auditējami labojumi, dzēšanas kārtība un regulāra kalibrēšana.
        </aside>
      </section>
    </main>
  );
}
