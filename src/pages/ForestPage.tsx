import {
  type AssortmentMatrix,
  type CostRatesPerM3,
  calculate,
  createDefaultAssortmentMatrix,
  matrixCellAnchor,
  matrixColumnAnchor,
  setAssortmentCell,
  standInputAnchor,
} from "@engine/calc";
import { parseInventory } from "@engine/inventory/parse";
import type { Inventory } from "@engine/inventory/types";
import { serializeJsonReport } from "@engine/report/json";
import { createTextReport } from "@engine/report/text";
import type { LawEdition } from "@engine/rules/law-tables";
import { MATRIX_COLUMNS, type MatrixColumn } from "@engine/species";
import { useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import fixture from "../../samples/expected/inventory-paraugmezs.json";
import { downloadBlob, downloadText } from "../lib/download";

const publicFixture = fixture as unknown as Inventory;
const initialCosts: CostRatesPerM3 = { cirsana: 11, pievesana: 7, transports: 6 };

interface ForestPageProps {
  initialInventory?: Inventory | null;
}

function integer(value: number): string {
  return Math.round(value).toLocaleString("lv-LV");
}

function decimal(value: number, digits = 2): string {
  return value.toLocaleString("lv-LV", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function percentage(value: number): string {
  return decimal(value, Number.isInteger(value) ? 0 : 2);
}

export function ForestPage({ initialInventory = null }: ForestPageProps) {
  const [inventory, setInventory] = useState<Inventory | null>(initialInventory);
  const [edition, setEdition] = useState<LawEdition>("current-2024");
  const [matrix, setMatrix] = useState<AssortmentMatrix>(() => createDefaultAssortmentMatrix());
  const [costs, setCosts] = useState<CostRatesPerM3>(initialCosts);
  const [profitPercent, setProfitPercent] = useState(10);
  const [excludedStandIds, setExcludedStandIds] = useState<string[]>([]);
  const [status, setStatus] = useState(initialInventory ? "Dati ielādēti" : "Gaida PDF failu");
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const result = useMemo(
    () =>
      inventory
        ? calculate(inventory, {
            edition,
            matrix,
            costsPerM3: costs,
            profitRate: profitPercent / 100,
            excludedStandIds,
          })
        : null,
    [inventory, edition, matrix, costs, profitPercent, excludedStandIds],
  );

  async function loadPdf(bytes: ArrayBuffer, label: string): Promise<void> {
    setError(null);
    setStatus("Nolasa PDF tekstu…");
    try {
      const { extractPdfTextBrowser } = await import("@engine/pdf/extract-text.browser");
      const extracted = await extractPdfTextBrowser(bytes);
      if (extracted.text.trim().length < 30) {
        throw new Error(
          "PDF failā nav teksta slāņa. Izmantojiet PDF ar atlasāmu tekstu vai pārbaudiet datus manuāli.",
        );
      }
      const parsed = parseInventory(extracted);
      const standCount = parsed.quarters.reduce((sum, quarter) => sum + quarter.stands.length, 0);
      if (standCount === 0) {
        throw new Error("Neizdevās atrast nogabalu tabulu. Pārbaudiet PDF formātu.");
      }
      setInventory(parsed);
      setExcludedStandIds([]);
      setStatus(`${label}: nolasīti ${standCount} nogabali`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Neizdevās nolasīt PDF failu.";
      setError(message);
      setStatus("Nolasīšana neizdevās");
    }
  }

  async function loadSample(): Promise<void> {
    setStatus("Ielādē paraugu…");
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}samples/inventory-paraugmezs.pdf`);
      if (!response.ok) throw new Error("Parauga fails nav pieejams.");
      await loadPdf(await response.arrayBuffer(), "Paraugmežs");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Paraugu neizdevās ielādēt.");
    }
  }

  async function onFile(file: File | undefined): Promise<void> {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Izvēlieties PDF failu.");
      return;
    }
    await loadPdf(await file.arrayBuffer(), file.name);
  }

  function updateMatrix(
    rowName: string,
    column: MatrixColumn,
    field: "sharePercent" | "priceEurM3",
    raw: string,
  ): void {
    const value = raw === "" ? null : Number(raw);
    if (value !== null && (!Number.isFinite(value) || value < 0)) return;
    setMatrix((current) => setAssortmentCell(current, rowName, column, { [field]: value }));
  }

  function updateCost(key: keyof CostRatesPerM3, raw: string): void {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    setCosts((current) => ({ ...current, [key]: value }));
  }

  function updateProfit(raw: string): void {
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return;
    setProfitPercent(value);
  }

  function toggleStand(id: string, included: boolean): void {
    setExcludedStandIds((current) =>
      included ? current.filter((candidate) => candidate !== id) : [...current, id],
    );
  }

  function jumpTo(anchor: string): void {
    const element = document.getElementById(anchor);
    element?.scrollIntoView({ behavior: "smooth", block: "center" });
    element?.classList.add("attention-ring");
    window.setTimeout(() => element?.classList.remove("attention-ring"), 1400);
  }

  async function copyReport(): Promise<void> {
    if (!inventory || !result) return;
    await navigator.clipboard.writeText(createTextReport(inventory, result));
    setStatus("Atskaite nokopēta");
  }

  async function exportDocx(): Promise<void> {
    if (!inventory || !result) return;
    const { Document, HeadingLevel, Packer, Paragraph } = await import("docx");
    const report = createTextReport(inventory, result);
    const document = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: "Meža inventarizācijas gala atskaite",
              heading: HeadingLevel.TITLE,
            }),
            ...report.split("\n").map((line) => new Paragraph({ text: line })),
          ],
        },
      ],
    });
    downloadBlob(await Packer.toBlob(document), "meza-atskaite.docx");
  }

  const report = inventory && result ? createTextReport(inventory, result) : "";
  const duplicateStandNumbers = new Set<number>();
  if (result) {
    const counts = new Map<number, number>();
    for (const entry of result.stands) {
      counts.set(entry.stand.number, (counts.get(entry.stand.number) ?? 0) + 1);
    }
    for (const [standNumber, count] of counts) {
      if (count > 1) duplicateStandNumbers.add(standNumber);
    }
  }

  return (
    <main className="page-shell">
      <header className="page-header">
        <Link className="back-link" to="/">
          ← Sākums
        </Link>
        <span className="section-kicker">1. prototips</span>
        <h1>Meža inventarizācija un cirsmas vērtība</h1>
        <p>Ielādējiet VMD inventarizācijas PDF. Atlase un visi skaitļi tiek aprēķināti pārlūkā.</p>
      </header>

      <section
        className="tool-panel upload-panel"
        aria-labelledby="upload-title"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void onFile(event.dataTransfer.files[0]);
        }}
      >
        <div>
          <span className="panel-number">01</span>
          <h2 id="upload-title">Inventarizācijas fails</h2>
          <p className="panel-copy">
            Ievelciet PDF šeit vai izvēlieties failu. PDF netiek sūtīts uz serveri.
          </p>
        </div>
        <div className="upload-actions">
          <input
            ref={fileInput}
            className="sr-only"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => void onFile(event.target.files?.[0])}
          />
          <button
            className="primary-button"
            type="button"
            onClick={() => fileInput.current?.click()}
          >
            Izvēlēties PDF
          </button>
          <button className="secondary-button" type="button" onClick={() => void loadSample()}>
            Izmantot paraugu (Paraugmežs)
          </button>
        </div>
        <p className="status-line" aria-live="polite">
          {status}
        </p>
        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      {inventory && result ? (
        <>
          <section className="tool-panel" aria-labelledby="stands-title">
            <div className="panel-heading">
              <span className="panel-number">02</span>
              <div>
                <h2 id="stands-title">Nolasītie nogabali</h2>
                <p className="panel-copy">
                  {inventory.property.propertyName} · {inventory.property.landUnit} ·
                  inventarizācija {inventory.property.inventoryYear}
                </p>
              </div>
            </div>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Nog.</th>
                    <th>Platība</th>
                    <th>Veids</th>
                    <th>Formula</th>
                    <th>Bon.</th>
                    <th>Vecums</th>
                    <th>Ø</th>
                    <th>Krāja</th>
                  </tr>
                </thead>
                <tbody>
                  {result.stands.map(({ id, quarterNumber, stand }) => (
                    <tr key={id}>
                      <td>
                        {duplicateStandNumbers.has(stand.number)
                          ? `${quarterNumber}/${stand.number}`
                          : stand.number}
                      </td>
                      <td>{decimal(stand.areaHa)}</td>
                      <td>{stand.landKind}</td>
                      <td
                        id={standInputAnchor(
                          quarterNumber,
                          stand.number,
                          "formula",
                          duplicateStandNumbers.has(stand.number),
                        )}
                      >
                        {stand.formulaRaw ?? "—"}
                      </td>
                      <td>{stand.bonitate ?? "—"}</td>
                      <td>{stand.ageYears ?? "—"}</td>
                      <td>{stand.diameterCm ?? "—"}</td>
                      <td>{stand.stockM3Ha ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="tool-panel" aria-labelledby="eligibility-title">
            <div className="panel-heading split-heading">
              <div>
                <span className="panel-number">03</span>
                <h2 id="eligibility-title">Kailcirtes atlase</h2>
              </div>
              <label className="field-label" id="law-edition">
                Tabulas redakcija
                <select
                  value={edition}
                  onChange={(event) => setEdition(event.target.value as LawEdition)}
                >
                  <option value="current-2024">Spēkā esošā (2024)</option>
                  <option value="task-pre-2022">Uzdevuma (līdz 29.06.2022)</option>
                </select>
              </label>
            </div>
            <div className="verdict-list">
              {result.stands.map(({ id, quarterNumber, stand, verdict, volumeM3, included }) => (
                <article className="verdict-row" key={id}>
                  <div className={`verdict-mark ${verdict.status}`}>
                    {verdict.status === "eligible"
                      ? "Jā"
                      : verdict.status === "not-assessed"
                        ? "—"
                        : "Nē"}
                  </div>
                  <div className="verdict-body">
                    <strong>
                      {duplicateStandNumbers.has(stand.number)
                        ? `${quarterNumber}. kvartāla ${stand.number}. nogabals`
                        : `${stand.number}. nogabals`}
                    </strong>
                    <span>{verdict.trace}</span>
                    {volumeM3 !== null ? <small>{decimal(volumeM3)} m³</small> : null}
                  </div>
                  {stand.flags.includes("protection-zone") ? (
                    <label
                      className="include-toggle"
                      id={standInputAnchor(
                        quarterNumber,
                        stand.number,
                        "include",
                        duplicateStandNumbers.has(stand.number),
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={included}
                        onChange={(event) => toggleStand(id, event.target.checked)}
                      />
                      iekļaut
                    </label>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="tool-panel" aria-labelledby="volume-title">
            <div className="panel-heading">
              <span className="panel-number">04</span>
              <h2 id="volume-title">Apjoms un sugas</h2>
            </div>
            <div className="metric-grid">
              <div className="metric-card featured">
                <span>Cērtamais apjoms</span>
                <strong>{integer(result.totalVolumeM3)} m³</strong>
              </div>
              {Object.entries(result.speciesVolumes)
                .filter(([, value]) => value > 0)
                .map(([code, value]) => (
                  <div className="metric-card" key={code}>
                    <span>{code}</span>
                    <strong>{decimal(value)} m³</strong>
                  </div>
                ))}
            </div>
          </section>

          <section className="tool-panel" aria-labelledby="matrix-title">
            <div className="panel-heading">
              <span className="panel-number">05</span>
              <div>
                <h2 id="matrix-title">Sortimenti un izmaksas</h2>
                <p className="panel-copy">Katrā šūnā: īpatsvars % un cena EUR/m³.</p>
              </div>
            </div>
            <div className="table-scroll matrix-scroll">
              <table className="data-table matrix-table">
                <thead>
                  <tr>
                    <th>Sortiments</th>
                    {MATRIX_COLUMNS.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.rows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">{row.label}</th>
                      {MATRIX_COLUMNS.map((column) => {
                        const cell = row.cells[column];
                        return (
                          <td key={column} id={matrixCellAnchor(row.name, column)}>
                            <input
                              aria-label={`${row.label} ${column} īpatsvars %`}
                              inputMode="decimal"
                              type="number"
                              min="0"
                              step="1"
                              placeholder="%"
                              value={cell?.sharePercent ?? ""}
                              onChange={(event) =>
                                updateMatrix(row.name, column, "sharePercent", event.target.value)
                              }
                            />
                            <input
                              aria-label={`${row.label} ${column} cena EUR/m3`}
                              inputMode="decimal"
                              type="number"
                              min="0"
                              step="1"
                              placeholder="€"
                              value={cell?.priceEurM3 ?? ""}
                              onChange={(event) =>
                                updateMatrix(row.name, column, "priceEurM3", event.target.value)
                              }
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Summa</th>
                    {MATRIX_COLUMNS.map((column) => (
                      <td id={matrixColumnAnchor(column)} key={column}>
                        {percentage(result.assortments.columnShareSums[column])} %
                      </td>
                    ))}
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="settings-grid">
              {(["cirsana", "pievesana", "transports"] as const).map((key) => (
                <label className="field-label" key={key}>
                  {key === "cirsana" ? "Ciršana" : key === "pievesana" ? "Pievešana" : "Transports"}{" "}
                  EUR/m³
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={costs[key]}
                    onChange={(event) => updateCost(key, event.target.value)}
                  />
                </label>
              ))}
              <label className="field-label">
                Peļņa %
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={profitPercent}
                  onChange={(event) => updateProfit(event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="report-panel" aria-labelledby="report-title">
            <div className="panel-heading report-heading">
              <div>
                <span className="panel-number light">06</span>
                <h2 id="report-title">Gala atskaite</h2>
              </div>
              <div className="report-actions">
                <button type="button" onClick={() => void copyReport()}>
                  Kopēt
                </button>
                <button type="button" onClick={() => downloadText(report, "meza-atskaite.txt")}>
                  .txt
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadText(
                      serializeJsonReport(inventory, result),
                      "meza-atskaite.json",
                      "application/json",
                    )
                  }
                >
                  .json
                </button>
                <button type="button" onClick={() => void exportDocx()}>
                  .docx
                </button>
              </div>
            </div>
            <pre className="headline-report">{report.split("\n").slice(0, 4).join("\n")}</pre>
            <div className="report-metrics">
              <div>
                <span>Ieņēmumi</span>
                <strong>{integer(result.finance.revenueEur)} EUR</strong>
              </div>
              <div>
                <span>Izmaksas</span>
                <strong>{integer(result.finance.costs.totalEur)} EUR</strong>
              </div>
              <div>
                <span>Peļņa</span>
                <strong>{integer(result.finance.profitEur)} EUR</strong>
              </div>
              <div>
                <span>Bez aizsargātā nogabala</span>
                <strong>{integer(result.alternativeWithoutFlagged.totalVolumeM3)} m³</strong>
                <small>
                  {integer(result.alternativeWithoutFlagged.finance.maxPurchaseEur)} EUR ·{" "}
                  {decimal(result.alternativeWithoutFlagged.finance.pricePerM3Eur)} EUR/m³
                </small>
              </div>
            </div>
            <div className="warnings-block">
              <h3>Brīdinājumi</h3>
              <ul>
                {result.warnings.map((warning) => (
                  <li key={`${warning.code}-${warning.anchor}-${warning.message}`}>
                    <button type="button" onClick={() => jumpTo(warning.anchor)}>
                      {warning.message}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <details className="full-report">
              <summary>Pilna atskaite</summary>
              <pre>{report.split("\n").slice(5).join("\n")}</pre>
            </details>
          </section>
        </>
      ) : null}
    </main>
  );
}

export { publicFixture };
