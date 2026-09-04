import { isValidIBAN } from "ibantools";

import type { ContractExtraction, Field, MoneyValue } from "./schema";

export type ValidationSeverity = "error" | "warning";

export interface ValidationIssue {
  code: string;
  path: string;
  message: string;
  severity: ValidationSeverity;
}

export interface ContractValidation {
  issues: ValidationIssue[];
  needsReview: boolean;
}

function hasText(value: string | null): value is string {
  return value !== null && value.trim().length > 0;
}

function validIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

function addIssue(
  issues: ValidationIssue[],
  code: string,
  path: string,
  message: string,
  severity: ValidationSeverity,
): void {
  issues.push({ code, path, message, severity });
}

function confidenceFields(contract: ContractExtraction): Array<[string, Field<unknown>]> {
  const fields: Array<[string, Field<unknown>]> = [
    ["document.type", contract.document.type],
    ["document.title", contract.document.title],
    ["document.signedAt", contract.document.signedAt],
    ["document.place", contract.document.place],
    ["object.address", contract.object.address],
    ["object.cadastreNumber", contract.object.cadastreNumber],
    ["object.area", contract.object.area],
    ["object.description", contract.object.description],
    ["financials.price", contract.financials.price],
    ["financials.rent", contract.financials.rent],
    ["financials.vat", contract.financials.vat],
    ["financials.deposit", contract.financials.deposit],
    ["financials.paymentDeadline", contract.financials.paymentDeadline],
    ["financials.penalty", contract.financials.penalty],
    ["term.effectiveFrom", contract.term.effectiveFrom],
    ["term.effectiveTo", contract.term.effectiveTo],
    ["term.durationMonths", contract.term.durationMonths],
    ["term.noticePeriodDays", contract.term.noticePeriodDays],
    ["term.autoRenewal", contract.term.autoRenewal],
  ];

  contract.parties.forEach((party, index) => {
    fields.push(
      [`parties.${index}.role`, party.role],
      [`parties.${index}.name`, party.name],
      [`parties.${index}.registrationNumber`, party.registrationNumber],
      [`parties.${index}.personalCode`, party.personalCode],
      [`parties.${index}.address`, party.address],
      [`parties.${index}.representative`, party.representative],
      [`parties.${index}.iban`, party.iban],
    );
  });
  return fields;
}

function checkCurrency(issues: ValidationIssue[], path: string, money: MoneyValue | null): void {
  if (money && money.currency.toUpperCase() !== "EUR") {
    addIssue(
      issues,
      "currency-not-eur",
      `${path}.currency`,
      `Valūtai jābūt EUR, bet norādīts ${money.currency}.`,
      "warning",
    );
  }
}

export function validateContract(contract: ContractExtraction): ContractValidation {
  const issues: ValidationIssue[] = [];
  const documentType = contract.document.type.value;

  if (documentType === null) {
    addIssue(
      issues,
      "missing-document-type",
      "document.type",
      "Nav noteikts līguma veids.",
      "error",
    );
  }

  const namedParties = contract.parties.filter((party) => hasText(party.name.value));
  if (namedParties.length < 2) {
    addIssue(
      issues,
      "missing-parties",
      "parties",
      "Jānorāda vismaz divi līdzēji ar nosaukumu vai vārdu.",
      "error",
    );
  }

  if (!hasText(contract.object.address.value) && !hasText(contract.object.cadastreNumber.value)) {
    addIssue(
      issues,
      "missing-object",
      "object",
      "Nav norādīta objekta adrese vai kadastra numurs.",
      "error",
    );
  }

  if (!hasText(contract.document.signedAt.value)) {
    addIssue(
      issues,
      "missing-signed-at",
      "document.signedAt",
      "Nav norādīts līguma parakstīšanas datums.",
      "error",
    );
  }

  if (documentType === "purchase" && contract.financials.price.value === null) {
    addIssue(
      issues,
      "missing-purchase-price",
      "financials.price",
      "Nav norādīta pirkuma cena.",
      "error",
    );
  }
  if (documentType === "lease" && contract.financials.rent.value === null) {
    addIssue(issues, "missing-lease-rent", "financials.rent", "Nav norādīta nomas maksa.", "error");
  }

  const dateFields: Array<[string, Field<string>]> = [
    ["document.signedAt", contract.document.signedAt],
    ["term.effectiveFrom", contract.term.effectiveFrom],
    ["term.effectiveTo", contract.term.effectiveTo],
  ];
  for (const [path, field] of dateFields) {
    if (hasText(field.value) && !validIsoDate(field.value)) {
      addIssue(issues, "date-format", path, "Datumam jābūt formātā GGGG-MM-DD.", "warning");
    }
  }

  const signedAt = contract.document.signedAt.value;
  const effectiveFrom = contract.term.effectiveFrom.value;
  const effectiveTo = contract.term.effectiveTo.value;
  if (
    hasText(signedAt) &&
    validIsoDate(signedAt) &&
    hasText(effectiveFrom) &&
    validIsoDate(effectiveFrom) &&
    signedAt > effectiveFrom
  ) {
    addIssue(
      issues,
      "date-order",
      "term.effectiveFrom",
      "Līguma spēkā stāšanās datums ir agrāks par parakstīšanas datumu.",
      "error",
    );
  }
  if (
    hasText(effectiveFrom) &&
    validIsoDate(effectiveFrom) &&
    hasText(effectiveTo) &&
    validIsoDate(effectiveTo) &&
    effectiveFrom > effectiveTo
  ) {
    addIssue(
      issues,
      "date-order",
      "term.effectiveTo",
      "Līguma beigu datums ir agrāks par spēkā stāšanās datumu.",
      "error",
    );
  }

  contract.parties.forEach((party, index) => {
    if (
      hasText(party.registrationNumber.value) &&
      !/^\d{11}$/.test(party.registrationNumber.value)
    ) {
      addIssue(
        issues,
        "registration-number-format",
        `parties.${index}.registrationNumber`,
        "Reģistrācijas numuram jābūt 11 cipariem.",
        "warning",
      );
    }
    if (
      hasText(party.personalCode.value) &&
      !/^(?:\d{6}-\d{5}|32\d{9})$/.test(party.personalCode.value)
    ) {
      addIssue(
        issues,
        "personal-code-format",
        `parties.${index}.personalCode`,
        "Personas kodam jābūt formātā DDMMYY-NNNNN vai 11 cipariem, kas sākas ar 32.",
        "warning",
      );
    }
    if (hasText(party.iban.value) && !isValidIBAN(party.iban.value.replaceAll(" ", ""))) {
      addIssue(
        issues,
        "iban-format",
        `parties.${index}.iban`,
        "IBAN konta numurs nav derīgs.",
        "warning",
      );
    }
  });

  if (
    hasText(contract.object.cadastreNumber.value) &&
    !/^\d{11}$/.test(contract.object.cadastreNumber.value)
  ) {
    addIssue(
      issues,
      "cadastre-format",
      "object.cadastreNumber",
      "Kadastra numuram jābūt 11 cipariem.",
      "warning",
    );
  }

  checkCurrency(issues, "financials.price", contract.financials.price.value);
  checkCurrency(issues, "financials.rent", contract.financials.rent.value);
  checkCurrency(issues, "financials.deposit", contract.financials.deposit.value);

  const price = contract.financials.price.value;
  const vat = contract.financials.vat.value;
  if (price?.netAmount !== undefined && price.grossAmount !== undefined && vat !== null) {
    const expectedGross = price.netAmount * (1 + vat.rate / 100);
    if (Math.abs(expectedGross - price.grossAmount) > 0.02) {
      addIssue(
        issues,
        "vat-inconsistent",
        "financials.vat",
        `Bruto un neto summa neatbilst norādītajai PVN likmei ${vat.rate} %.`,
        "warning",
      );
    }
  }

  for (const [path, field] of confidenceFields(contract)) {
    if (field.value !== null && field.confidence < 0.7) {
      addIssue(
        issues,
        "low-confidence",
        path,
        `Lauka uzticamība ir ${Math.round(field.confidence * 100)} %; vērtība jāpārbauda.`,
        "warning",
      );
    }
  }

  return { issues, needsReview: issues.length > 0 };
}
