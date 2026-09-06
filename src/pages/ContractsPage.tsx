import { useMemo, useState } from "react";
import { Link } from "react-router";

import type { ContractAnalysis } from "../../engine/contracts/extract";
import {
  contractExtractionSchema,
  type DocumentType,
  type Field,
} from "../../engine/contracts/schema";
import leaseCached from "../../samples/expected/contract-synthetic-nomas-ligums.extracted.json";
import purchaseCached from "../../samples/expected/contract-synthetic-pirkuma-ligums.extracted.json";
import incompleteCached from "../../samples/expected/contract-synthetic-pirkuma-nepilns.extracted.json";
import {
  ContractPdfError,
  extractContractPdfText,
} from "../components/contracts/extractContractPdf";
import { AnalysisApiError, postAnalysisJson } from "../lib/api";

interface ContractFieldRow {
  path: string;
  label: string;
  field: Field<unknown>;
}

interface SampleDefinition {
  id: string;
  label: string;
  description: string;
  cached: ContractAnalysis;
  type: DocumentType;
}

const samples: SampleDefinition[] = [
  {
    id: "synthetic-pirkuma-ligums",
    label: "Pilns pirkuma līgums",
    description:
      "Rezultātā meklējiet pārdevēju un pircēju, pirkuma cenu 48 500 EUR un maksājuma termiņu 30.08.2026. Katram laukam varēsiet salīdzināt citātu ar PDF.",
    cached: purchaseCached as unknown as ContractAnalysis,
    type: "purchase",
  },
  {
    id: "synthetic-nomas-ligums",
    label: "Pilns nomas līgums",
    description:
      "Rezultātā meklējiet nomas maksu 650 EUR mēnesī bez PVN, drošības naudu 1 300 EUR un nomas termiņu no 01.10.2026. līdz 30.09.2029.",
    cached: leaseCached as unknown as ContractAnalysis,
    type: "lease",
  },
  {
    id: "synthetic-pirkuma-nepilns",
    label: "Nepilnīgs pirkuma līgums",
    description:
      "Šajā failā apzināti trūkst pirkuma cenas un kadastra numurs ir nepareizā formātā. Rezultātā jāparādās brīdinājumiem par šīm problēmām.",
    cached: incompleteCached as unknown as ContractAnalysis,
    type: "purchase",
  },
];

function apiEndpoint(): string {
  const base = import.meta.env.BASE_URL.endsWith("/")
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}api/extract`;
}

async function requestContractAnalysis(
  text: string,
  fileName: string,
  documentTypeHint?: DocumentType,
): Promise<ContractAnalysis> {
  const payload = await postAnalysisJson(apiEndpoint(), { text, fileName, documentTypeHint });
  if (typeof payload !== "object" || payload === null || !("data" in payload)) {
    throw new AnalysisApiError("Serveris atgrieza neatpazīstamu rezultātu.");
  }
  contractExtractionSchema.parse(payload.data);
  return payload as unknown as ContractAnalysis;
}

function fieldsFor(analysis: ContractAnalysis): ContractFieldRow[] {
  const contract = analysis.data;
  const rows: ContractFieldRow[] = [
    { path: "document.type", label: "Līguma veids", field: contract.document.type },
    { path: "document.title", label: "Nosaukums", field: contract.document.title },
    { path: "document.signedAt", label: "Parakstīšanas datums", field: contract.document.signedAt },
    { path: "document.place", label: "Parakstīšanas vieta", field: contract.document.place },
  ];
  contract.parties.forEach((party, index) => {
    const prefix = `Līdzējs ${index + 1}`;
    rows.push(
      { path: `parties.${index}.role`, label: `${prefix}: loma`, field: party.role },
      { path: `parties.${index}.name`, label: `${prefix}: nosaukums`, field: party.name },
      {
        path: `parties.${index}.registrationNumber`,
        label: `${prefix}: reģistrācijas Nr.`,
        field: party.registrationNumber,
      },
      {
        path: `parties.${index}.personalCode`,
        label: `${prefix}: personas kods`,
        field: party.personalCode,
      },
      { path: `parties.${index}.address`, label: `${prefix}: adrese`, field: party.address },
      {
        path: `parties.${index}.representative`,
        label: `${prefix}: pārstāvis`,
        field: party.representative,
      },
      { path: `parties.${index}.iban`, label: `${prefix}: IBAN`, field: party.iban },
    );
  });
  rows.push(
    { path: "object.address", label: "Objekta adrese", field: contract.object.address },
    {
      path: "object.cadastreNumber",
      label: "Kadastra numurs",
      field: contract.object.cadastreNumber,
    },
    { path: "object.area", label: "Platība", field: contract.object.area },
    { path: "object.description", label: "Objekta apraksts", field: contract.object.description },
    { path: "financials.price", label: "Pirkuma cena", field: contract.financials.price },
    { path: "financials.rent", label: "Nomas maksa", field: contract.financials.rent },
    { path: "financials.vat", label: "PVN", field: contract.financials.vat },
    { path: "financials.deposit", label: "Drošības nauda", field: contract.financials.deposit },
    {
      path: "financials.paymentDeadline",
      label: "Maksājuma termiņš",
      field: contract.financials.paymentDeadline,
    },
    { path: "financials.penalty", label: "Līgumsods", field: contract.financials.penalty },
    { path: "term.effectiveFrom", label: "Spēkā no", field: contract.term.effectiveFrom },
    { path: "term.effectiveTo", label: "Spēkā līdz", field: contract.term.effectiveTo },
    { path: "term.durationMonths", label: "Ilgums mēnešos", field: contract.term.durationMonths },
    {
      path: "term.noticePeriodDays",
      label: "Uzteikuma termiņš dienās",
      field: contract.term.noticePeriodDays,
    },
    {
      path: "term.autoRenewal",
      label: "Automātiska pagarināšana",
      field: contract.term.autoRenewal,
    },
  );
  return rows;
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Nav atrasts";
  if (typeof value === "boolean") return value ? "Jā" : "Nē";
  if (typeof value === "number" || typeof value === "string") return String(value);
  if (typeof value !== "object" || Array.isArray(value)) return String(value);
  const record = value as Record<string, unknown>;
  if (typeof record.amount === "number" && typeof record.currency === "string") {
    const period = typeof record.period === "string" ? ` / ${record.period}` : "";
    return `${record.amount.toLocaleString("lv-LV")} ${record.currency}${period}`;
  }
  if (typeof record.value === "number" && typeof record.unit === "string") {
    return `${record.value.toLocaleString("lv-LV")} ${record.unit}`;
  }
  if (typeof record.included === "boolean" && typeof record.rate === "number") {
    return `${record.included ? "Iekļauts" : "Nav iekļauts"}, ${record.rate} %`;
  }
  return JSON.stringify(value);
}

function downloadJson(analysis: ContractAnalysis): void {
  const url = URL.createObjectURL(
    new Blob([`${JSON.stringify(analysis, null, 2)}\n`], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "liguma-dati.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ContractsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [hint, setHint] = useState<DocumentType | "">("");
  const [selectedSampleId, setSelectedSampleId] = useState("synthetic-pirkuma-ligums");
  const [analysis, setAnalysis] = useState<ContractAnalysis | null>(null);
  const [isCached, setIsCached] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedSample = samples.find((sample) => sample.id === selectedSampleId);
  const samplePdfUrl = `${import.meta.env.BASE_URL}samples/contracts/${selectedSampleId}.pdf`;
  const rows = useMemo(() => (analysis ? fieldsFor(analysis) : []), [analysis]);
  const mailto = analysis
    ? `mailto:?subject=${encodeURIComponent(analysis.summary.subject)}&body=${encodeURIComponent(analysis.summary.body)}`
    : "mailto:";

  function acceptFile(nextFile: File): void {
    setFile(nextFile);
    setHint("");
    setAnalysis(null);
    setIsCached(false);
    setError("");
  }

  function showSampleResult(): void {
    if (!selectedSample) return;
    setFile(null);
    setError("");
    setCopied(false);
    setHint(selectedSample.type);
    setAnalysis(selectedSample.cached);
    setIsCached(true);
  }

  async function extract(): Promise<void> {
    if (!file) return;
    setIsLoading(true);
    setError("");
    setAnalysis(null);
    setIsCached(false);
    try {
      const text = await extractContractPdfText(file);
      const result = await requestContractAnalysis(text, file.name, hint || undefined);
      setAnalysis(result);
    } catch (caught) {
      if (caught instanceof ContractPdfError || caught instanceof AnalysisApiError) {
        setError(caught.message);
      } else {
        setError("Dokumentu neizdevās apstrādāt. Mēģiniet vēlreiz.");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function copySummary(): Promise<void> {
    if (!analysis) return;
    try {
      await navigator.clipboard.writeText(analysis.summary.body);
      setCopied(true);
    } catch {
      setError("Kopsavilkumu neizdevās nokopēt.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 text-slate-900 sm:px-6 lg:px-8">
      <header className="mb-8 max-w-3xl">
        <Link className="mb-8 inline-flex text-sm font-semibold text-emerald-800" to="/">
          ← Sākums
        </Link>
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
          02 · Līgumu datu izvilkšana
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Pārbaudāmi dati no līguma PDF
        </h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          Augšupielādējiet pirkuma vai nomas līgumu. Saņemsiet tabulu ar līguma pusēm, summām,
          termiņiem un citātiem no dokumenta, kā arī gatavu e-pasta kopsavilkumu.
        </p>
      </header>

      <section className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-5">
          <h2 className="text-xl font-bold text-emerald-950">Izmēģiniet ar testa failu</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm leading-6 text-emerald-900">
            <li>Lejupielādējiet parauga PDF.</li>
            <li>Izvēlieties šo failu augšupielādes laukā.</li>
            <li>Spiediet “Izvilkt datus” un pārbaudiet tabulu un e-pasta kopsavilkumu zemāk.</li>
          </ol>
          <label
            className="mt-5 block text-sm font-semibold text-emerald-950"
            htmlFor="contract-sample"
          >
            Līguma paraugs
          </label>
          <select
            id="contract-sample"
            className="mt-2 block w-full rounded-lg border border-emerald-200 bg-white px-3 py-2"
            value={selectedSampleId}
            onChange={(event) => setSelectedSampleId(event.target.value)}
          >
            {samples.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.label}
              </option>
            ))}
          </select>
          <p className="mt-3 text-sm leading-6 text-emerald-900">{selectedSample?.description}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <a
              className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white"
              href={samplePdfUrl}
              download={`${selectedSampleId}.pdf`}
            >
              Lejupielādēt parauga PDF
            </a>
            <a
              className="text-sm font-semibold text-emerald-800 underline"
              href={samplePdfUrl}
              target="_blank"
              rel="noreferrer"
            >
              Atvērt PDF
            </a>
          </div>
          <p className="mt-3 text-xs leading-5 text-emerald-900">Visi parauga dati ir izdomāti.</p>
          <div className="mt-4 border-t border-emerald-200 pt-4">
            <button
              type="button"
              className="text-sm font-semibold text-emerald-800 underline disabled:opacity-50"
              disabled={isLoading}
              onClick={showSampleResult}
            >
              Skatīt gatavo rezultātu
            </button>
            <p className="mt-1 text-xs leading-5 text-emerald-900">
              Atver iepriekš sagatavotu šī parauga analīzi uzreiz, bez faila augšupielādes.
            </p>
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-xl font-bold">Augšupielādējiet līgumu</h2>
          <label
            className="flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-600"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const dropped = event.dataTransfer.files[0];
              if (dropped && !isLoading) acceptFile(dropped);
            }}
          >
            <span className="font-semibold">Ievelciet līguma PDF vai izvēlieties failu</span>
            <span className="mt-1 text-sm text-slate-500">
              Pirkuma vai nomas līgums latviešu valodā
            </span>
            <input
              className="sr-only"
              type="file"
              accept="application/pdf,.pdf"
              disabled={isLoading}
              onChange={(event) => {
                const next = event.target.files?.[0];
                if (next) acceptFile(next);
                event.target.value = "";
              }}
            />
            {file && (
              <span className="mt-3 rounded-full bg-emerald-100 px-3 py-1 text-sm text-emerald-800">
                {file.name}
              </span>
            )}
          </label>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-sm font-medium">
              Līguma veids
              <select
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                value={hint}
                onChange={(event) => setHint(event.target.value as DocumentType | "")}
              >
                <option value="">Noteikt automātiski</option>
                <option value="purchase">Pirkuma līgums</option>
                <option value="lease">Nomas līgums</option>
                <option value="other">Cits līgums</option>
              </select>
            </label>
            <button
              type="button"
              className="rounded-lg bg-emerald-700 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!file || isLoading}
              onClick={() => void extract()}
            >
              {isLoading ? "Izvelk datus..." : "Izvilkt datus"}
            </button>
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Pēc analīzes rezultāts parādīsies zemāk. PDF teksts tiek nolasīts pārlūkā; analīzei
            nosūtām tikai tekstu.
          </p>
        </div>
      </section>

      {error && (
        <p
          className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
          role="alert"
        >
          {error}
        </p>
      )}
      {isLoading && (
        <p className="mt-5 text-sm text-slate-600" role="status">
          Nolasa un pārbauda līguma datus...
        </p>
      )}

      {analysis && (
        <div className="mt-8 space-y-8">
          <section aria-labelledby="contract-fields-heading">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 id="contract-fields-heading" className="text-2xl font-bold">
                Izvilktie lauki
              </h2>
              {isCached && (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-sky-800">
                  Sagatavots parauga rezultāts
                </span>
              )}
              {analysis.needsReview && (
                <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-900">
                  Jāpārbauda
                </span>
              )}
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Lauks</th>
                    <th className="px-4 py-3 font-semibold">Vērtība</th>
                    <th className="px-4 py-3 font-semibold">Uzticamība</th>
                    <th className="px-4 py-3 font-semibold">Citāts</th>
                    <th className="px-4 py-3 font-semibold">Statuss</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const issue = analysis.issues.find(
                      (candidate) =>
                        candidate.path === row.path || candidate.path.startsWith(`${row.path}.`),
                    );
                    const status = issue
                      ? issue.severity === "error"
                        ? "Kļūda"
                        : "Jāpārbauda"
                      : row.field.value === null
                        ? "Nav atrasts"
                        : "Atrasts";
                    return (
                      <tr key={row.path} className="align-top">
                        <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                          {row.label}
                        </th>
                        <td className="px-4 py-3">{displayValue(row.field.value)}</td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {Math.round(row.field.confidence * 100)} %
                        </td>
                        <td className="max-w-md px-4 py-3 text-slate-600">
                          {row.field.source
                            ? `${row.field.source.page ? `${row.field.source.page}. lpp.: ` : ""}${row.field.source.quote}`
                            : "-"}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium">{status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="text-xl font-bold">Pārbaudāmie jautājumi</h2>
              {analysis.issues.length ? (
                <ul className="mt-3 space-y-2">
                  {analysis.issues.map((issue) => (
                    <li
                      key={`${issue.code}-${issue.path}-${issue.message}`}
                      className="text-sm leading-6"
                    >
                      <span className="font-semibold">
                        {issue.severity === "error" ? "Kļūda" : "Brīdinājums"}:
                      </span>{" "}
                      {issue.message} <span className="text-slate-500">({issue.path})</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm">Automātiskajā pārbaudē problēmas nav atrastas.</p>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <label className="text-xl font-bold" htmlFor="contract-summary">
                E-pasta kopsavilkums
              </label>
              <textarea
                id="contract-summary"
                className="mt-3 min-h-72 w-full rounded-lg border border-slate-300 p-3 text-sm leading-6"
                readOnly
                value={analysis.summary.body}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  href={mailto}
                >
                  Atvērt e-pastā
                </a>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                  onClick={() => void copySummary()}
                >
                  {copied ? "Nokopēts" : "Kopēt"}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold"
                  onClick={() => downloadJson(analysis)}
                >
                  Lejupielādēt JSON
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
