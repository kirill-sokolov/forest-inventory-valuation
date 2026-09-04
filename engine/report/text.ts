import type { CalculatedStand, CalculationResult } from "../calc";
import type { Inventory } from "../inventory/types";
import { LAW_EDITION_LABELS } from "../rules/law-tables";
import { SPECIES_DISPLAY_ORDER } from "../species";

export function createHeadlineLines(
  inventory: Inventory,
  calculation: CalculationResult,
): [string, string, string, string] {
  const duplicateStandNumbers = repeatedStandNumbers(calculation.stands);
  const includedStandLabels = calculation.stands
    .filter((entry) => entry.included)
    .map((entry) =>
      duplicateStandNumbers.has(entry.stand.number)
        ? `${entry.quarterNumber}.kv./${entry.stand.number}.nog`
        : `${entry.stand.number}.nog`,
    );
  const species = orderedSpeciesEntries(calculation.speciesVolumes)
    .map(([code, volumeM3]) => `${code}=${Math.round(volumeM3)} m3`)
    .join("; ");
  return [
    `NĪ ${inventory.property.propertyName}, zemes vienība ${inventory.property.landUnit}`,
    `Kailcirtes: ${includedStandLabels.join(";")}`,
    `Cērtamais apjoms: ${Math.round(calculation.totalVolumeM3)} m3${species ? ` (${species})` : ""}`,
    `Maksimālā iegādes summa = ${formatInteger(calculation.finance.maxPurchaseEur)} EUR, jeb ${calculation.finance.pricePerM3Eur.toFixed(2)} EUR/m3.`,
  ];
}

/** Latvian plain-text report. The four assignment headline lines always come first. */
export function createTextReport(inventory: Inventory, calculation: CalculationResult): string {
  const lines: string[] = [...createHeadlineLines(inventory, calculation), ""];
  const duplicateStandNumbers = repeatedStandNumbers(calculation.stands);

  lines.push("Nogabalu izvērtējums");
  lines.push(
    "Nogabals | Platība, ha | Formula | Valdošā suga | Bonitāte | Vecums | Caurmērs | Rezultāts | Pazīmes | Apjoms, m3",
  );
  for (const entry of calculation.stands) {
    lines.push(formatStand(entry, duplicateStandNumbers.has(entry.stand.number)));
  }

  lines.push("", "Sugu apjomi");
  const speciesEntries = orderedSpeciesEntries(calculation.speciesVolumes);
  if (speciesEntries.length === 0) lines.push("Nav cērtamā apjoma.");
  for (const [code, volumeM3] of speciesEntries) {
    lines.push(`${code}: ${formatDecimal(volumeM3)} m3`);
  }

  lines.push("", "Sortimentu ieņēmumi");
  for (const row of calculation.assortments.rows) {
    lines.push(`${row.label}: ${formatMoney(row.revenueEur)} EUR`);
  }
  lines.push(`Ieņēmumi kopā: ${formatMoney(calculation.finance.revenueEur)} EUR`);
  lines.push(
    `Ciršana: ${formatMoney(calculation.finance.costs.cirsanaEur)} EUR (${formatDecimal(calculation.settings.costsPerM3.cirsana)} EUR/m3)`,
  );
  lines.push(
    `Pievešana: ${formatMoney(calculation.finance.costs.pievesanaEur)} EUR (${formatDecimal(calculation.settings.costsPerM3.pievesana)} EUR/m3)`,
  );
  lines.push(
    `Transports: ${formatMoney(calculation.finance.costs.transportsEur)} EUR (${formatDecimal(calculation.settings.costsPerM3.transports)} EUR/m3)`,
  );
  lines.push(`Izmaksas kopā: ${formatMoney(calculation.finance.costs.totalEur)} EUR`);
  lines.push(
    `Peļņa (${formatDecimal(calculation.finance.profitRate * 100)} %): ${formatMoney(calculation.finance.profitEur)} EUR`,
  );
  lines.push(`Maksimālā iegādes summa: ${formatMoney(calculation.finance.maxPurchaseEur)} EUR`);
  lines.push(`Cena: ${calculation.finance.pricePerM3Eur.toFixed(2)} EUR/m3`);
  lines.push(`Tabulas redakcija: ${LAW_EDITION_LABELS[calculation.settings.edition]}`);

  lines.push("", "Alternatīva bez nogabaliem ar aizsardzības pazīmi");
  lines.push(
    `Cērtamais apjoms: ${formatDecimal(calculation.alternativeWithoutFlagged.totalVolumeM3)} m3`,
  );
  lines.push(
    `Maksimālā iegādes summa: ${formatMoney(calculation.alternativeWithoutFlagged.finance.maxPurchaseEur)} EUR (${calculation.alternativeWithoutFlagged.finance.pricePerM3Eur.toFixed(2)} EUR/m3)`,
  );

  lines.push("", "Brīdinājumi");
  if (calculation.warnings.length === 0) lines.push("Nav brīdinājumu.");
  else for (const warning of calculation.warnings) lines.push(`- ${warning.message}`);

  return lines.join("\n");
}

export const renderTextReport = createTextReport;

function formatStand(entry: CalculatedStand, disambiguate: boolean): string {
  const verdict =
    entry.verdict.status === "eligible"
      ? entry.included
        ? "cērtams"
        : "cērtams, izslēgts"
      : entry.verdict.status === "not-eligible"
        ? "nav cērtams"
        : "nav vērtēts";
  const flags = entry.stand.flags.length > 0 ? entry.stand.flags.map(localizeFlag).join(", ") : "—";
  const resultText =
    entry.verdict.status === "not-assessed"
      ? entry.verdict.trace
      : `${verdict}: ${entry.verdict.trace}`;
  return [
    disambiguate
      ? `${entry.quarterNumber}. kv. / ${entry.stand.number}. nog.`
      : `${entry.stand.number}. nog.`,
    formatDecimal(entry.stand.areaHa),
    entry.stand.formulaRaw ?? "—",
    entry.verdict.dominantSpecies ?? "—",
    entry.stand.bonitate ?? "—",
    entry.stand.ageYears ?? "—",
    entry.stand.diameterCm ?? "—",
    resultText,
    flags,
    entry.volumeM3 === null ? "—" : formatDecimal(entry.volumeM3),
  ].join(" | ");
}

function localizeFlag(flag: string): string {
  switch (flag) {
    case "protection-zone":
      return "aizsardzības pazīme";
    case "non-forest":
      return "nav mežaudze";
    case "no-formula":
      return "nav formulas";
    default:
      return flag;
  }
}

function orderedSpeciesEntries(volumes: Record<string, number>): Array<[string, number]> {
  const knownOrder = new Map<string, number>(
    SPECIES_DISPLAY_ORDER.map((code, index) => [code, index]),
  );
  return Object.entries(volumes)
    .filter(([, volume]) => Math.abs(volume) > 1e-12)
    .sort(([left], [right]) => {
      const leftIndex = knownOrder.get(left) ?? Number.MAX_SAFE_INTEGER;
      const rightIndex = knownOrder.get(right) ?? Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex || left.localeCompare(right, "lv");
    });
}

function formatInteger(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "-" : "";
  return `${sign}${Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}`;
}

function formatDecimal(value: number): string {
  return value.toFixed(2).replace(".", ",");
}

function formatMoney(value: number): string {
  const [whole = "0", decimals = "00"] = Math.abs(value).toFixed(2).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${value < 0 ? "-" : ""}${grouped},${decimals}`;
}

function repeatedStandNumbers(stands: readonly CalculatedStand[]): Set<number> {
  const counts = new Map<number, number>();
  for (const entry of stands) {
    counts.set(entry.stand.number, (counts.get(entry.stand.number) ?? 0) + 1);
  }
  return new Set(
    [...counts.entries()].filter(([, count]) => count > 1).map(([standNumber]) => standNumber),
  );
}
