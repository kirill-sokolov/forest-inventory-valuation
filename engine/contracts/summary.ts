import type { ContractExtraction, DocumentType, Field, MoneyValue, RentValue } from "./schema";
import type { ContractValidation } from "./validate";

export interface ContractSummary {
  subject: string;
  body: string;
}

const documentTypeLabels: Record<DocumentType, string> = {
  purchase: "Pirkuma līgums",
  lease: "Nomas līgums",
  other: "Līgums",
};

const roleLabels: Record<string, string> = {
  seller: "Pārdevējs",
  buyer: "Pircējs",
  lessor: "Iznomātājs",
  lessee: "Nomnieks",
  other: "Līdzējs",
};

function text(field: Field<string>, fallback = "nav norādīts"): string {
  return field.value?.trim() || fallback;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("lv-LV", { maximumFractionDigits: 2 }).format(value);
}

function money(value: MoneyValue | null): string {
  if (!value) return "nav norādīts";
  return `${formatNumber(value.amount)} ${value.currency}`;
}

function rent(value: RentValue | null): string {
  if (!value) return "nav norādīts";
  return `${formatNumber(value.amount)} ${value.currency} / ${value.period}`;
}

export function renderContractSummary(
  contract: ContractExtraction,
  validation: ContractValidation,
): ContractSummary {
  const type = contract.document.type.value ?? "other";
  const typeLabel = documentTypeLabels[type];
  const objectLabel =
    contract.object.address.value?.trim() ||
    contract.object.cadastreNumber.value?.trim() ||
    "objekts";
  const subject = `${typeLabel}: ${objectLabel}`;

  const parties = contract.parties.length
    ? contract.parties.map((party) => {
        const role = party.role.value ? roleLabels[party.role.value] : roleLabels.other;
        const identifier = party.registrationNumber.value ?? party.personalCode.value;
        return `- ${role}: ${text(party.name)}${identifier ? ` (${identifier})` : ""}`;
      })
    : ["- nav norādīti"];

  const area = contract.object.area.value;
  const conditions = contract.specialConditions.length
    ? contract.specialConditions.map(
        (condition) =>
          `- ${condition.title}${condition.page ? ` (${condition.page}. lpp.)` : ""}: ${condition.quote}`,
      )
    : ["- nav norādīti"];

  const issues = validation.issues.length
    ? validation.issues.map((issue) => `- ${issue.message}`)
    : ["- Nav konstatēti."];

  const body = [
    `${typeLabel}: ${text(contract.document.title)}`,
    `Parakstīts: ${text(contract.document.signedAt)}${contract.document.place.value ? `, ${contract.document.place.value}` : ""}`,
    "",
    "Līdzēji",
    ...parties,
    "",
    "Līguma objekts",
    `- Adrese: ${text(contract.object.address)}`,
    `- Kadastra numurs: ${text(contract.object.cadastreNumber)}`,
    `- Platība: ${area ? `${formatNumber(area.value)} ${area.unit}` : "nav norādīta"}`,
    `- Apraksts: ${text(contract.object.description)}`,
    "",
    "Finanšu nosacījumi",
    `- Pirkuma cena: ${money(contract.financials.price.value)}`,
    `- Nomas maksa: ${rent(contract.financials.rent.value)}`,
    `- Drošības nauda: ${money(contract.financials.deposit.value)}`,
    `- Maksājuma termiņš: ${text(contract.financials.paymentDeadline)}`,
    `- Līgumsods: ${text(contract.financials.penalty)}`,
    "",
    "Termiņš",
    `- No: ${text(contract.term.effectiveFrom)}`,
    `- Līdz: ${text(contract.term.effectiveTo)}`,
    `- Ilgums: ${contract.term.durationMonths.value === null ? "nav norādīts" : `${contract.term.durationMonths.value} mēneši`}`,
    `- Uzteikuma termiņš: ${contract.term.noticePeriodDays.value === null ? "nav norādīts" : `${contract.term.noticePeriodDays.value} dienas`}`,
    `- Automātiska pagarināšana: ${contract.term.autoRenewal.value === null ? "nav norādīta" : contract.term.autoRenewal.value ? "jā" : "nē"}`,
    "",
    "Īpašie nosacījumi",
    ...conditions,
    "",
    "Pārbaudāmie jautājumi",
    ...issues,
  ].join("\n");

  return { subject, body };
}
