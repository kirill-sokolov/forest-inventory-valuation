import { describe, expect, it } from "vitest";

import { type ContractExtraction, contractExtractionSchema, type Field } from "./schema";
import { renderContractSummary } from "./summary";
import { groundQuote, validateContract } from "./validate";

function field<T>(value: T | null, confidence = value === null ? 0 : 0.99): Field<T> {
  return {
    value,
    confidence,
    source: value === null ? null : { page: 1, quote: String(value) },
  };
}

function completePurchase(): ContractExtraction {
  return {
    document: {
      type: field("purchase" as const),
      title: field("Nekustamā īpašuma pirkuma līgums"),
      signedAt: field("2026-08-12"),
      place: field("Rīga"),
    },
    parties: [
      {
        role: field("seller" as const),
        name: field("SIA Parauga Pārdevējs"),
        registrationNumber: field("40000000001"),
        personalCode: field<string>(null),
        address: field("Parauga iela 1, Rīga"),
        representative: field("Anna Parauga"),
        iban: field("LV80BANK0000435195001"),
      },
      {
        role: field("buyer" as const),
        name: field("Jānis Piemērs"),
        registrationNumber: field<string>(null),
        personalCode: field("320180-00001"),
        address: field("Testa iela 2, Rīga"),
        representative: field<string>(null),
        iban: field<string>(null),
      },
    ],
    object: {
      address: field("Meža ceļš 1, Paraugu pagasts"),
      cadastreNumber: field("00000000001"),
      area: field({ value: 4.7, unit: "ha" }),
      description: field("Zemes īpašums ar mežaudzi"),
    },
    financials: {
      price: field({ amount: 25_000, currency: "EUR", netAmount: null, grossAmount: null }),
      rent: field(null),
      vat: field({ included: true, rate: 21 }),
      deposit: field(null),
      paymentDeadline: field("2026-08-30"),
      penalty: field("0,1 % dienā"),
    },
    term: {
      effectiveFrom: field("2026-08-12"),
      effectiveTo: field<string>(null),
      durationMonths: field<number>(null),
      noticePeriodDays: field<number>(null),
      autoRenewal: field<boolean>(null),
    },
    specialConditions: [
      {
        title: "Nostiprināšana zemesgrāmatā",
        quote: "Pircējs iesniedz nostiprinājuma lūgumu.",
        page: 2,
      },
    ],
  };
}

describe("contract extraction schema", () => {
  it("round-trips a complete purchase contract", () => {
    const contract = completePurchase();
    expect(contractExtractionSchema.parse(contract)).toEqual(contract);
  });

  it("rejects confidence outside the 0..1 range", () => {
    const contract = completePurchase();
    contract.document.title.confidence = 1.2;
    expect(contractExtractionSchema.safeParse(contract).success).toBe(false);
  });
});

describe("deterministic contract validation", () => {
  it("accepts a complete purchase contract", () => {
    const result = validateContract(completePurchase());
    expect(result.needsReview).toBe(false);
    expect(result.issues).toEqual([]);
  });

  it("flags required fields and low confidence", () => {
    const contract = completePurchase();
    contract.financials.price = field(null);
    contract.document.title.confidence = 0.5;

    const result = validateContract(contract);
    expect(result.needsReview).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing-purchase-price", severity: "error" }),
        expect.objectContaining({ code: "low-confidence", path: "document.title" }),
      ]),
    );
  });

  it("flags date order, identifier formats, currency, IBAN, and inconsistent VAT", () => {
    const contract = completePurchase();
    contract.document.signedAt = field("2026-09-01");
    contract.term.effectiveFrom = field("2026-08-01");
    contract.object.cadastreNumber = field("123-ABC");
    contract.parties[0].iban = field("LV00INVALID");
    contract.financials.price = field({
      amount: 121,
      currency: "USD",
      netAmount: 100,
      grossAmount: 130,
    });

    const result = validateContract(contract);
    expect(result.issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "date-order",
        "cadastre-format",
        "iban-format",
        "currency-not-eur",
        "vat-inconsistent",
      ]),
    );
  });

  it("requires rent, not price, for a lease", () => {
    const contract = completePurchase();
    contract.document.type = field("lease" as const);
    contract.financials.price = field(null);
    contract.financials.rent = field(null);

    const result = validateContract(contract);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing-lease-rent", severity: "error" }),
      ]),
    );
    expect(result.issues.some((issue) => issue.code === "missing-purchase-price")).toBe(false);
  });
});

describe("Latvian e-mail summary", () => {
  it("renders parties, object, money, term, special conditions, and issues", () => {
    const contract = completePurchase();
    contract.financials.price = field(null);
    const validation = validateContract(contract);
    const summary = renderContractSummary(contract, validation);

    expect(summary.subject).toContain("Pirkuma līgums");
    expect(summary.body).toContain("Līdzēji");
    expect(summary.body).toContain("Līguma objekts");
    expect(summary.body).toContain("Finanšu nosacījumi");
    expect(summary.body).toContain("Termiņš");
    expect(summary.body).toContain("Īpašie nosacījumi");
    expect(summary.body).toContain("Pārbaudāmie jautājumi");
    expect(summary.body).toContain("Nav norādīta pirkuma cena");
  });
});

describe("contract quote grounding", () => {
  const sourceText = [
    "[PAGE 1]",
    "Pirkuma cena ir 25000 EUR. Līgums parakstīts 2026-08-12 Rīgā.",
    "Pārdevējs: SIA Parauga Pārdevējs, reģistrācijas Nr. 40000000001, Parauga iela 1, Rīga.",
    "Pircējs: Jānis Piemērs, personas kods 320180-00001, Testa iela 2, Rīga.",
    "Objekts: Meža ceļš 1, Paraugu pagasts, kadastra numurs 00000000001, 4.7 ha.",
    "Zemes īpašums ar mežaudzi. Samaksa līdz 2026-08-30. Līgumsods 0,1 % dienā.",
    "[PAGE 2]",
    "Pircējs iesniedz nostiprinājuma lūgumu zemesgrāmatā.",
  ].join("\n");

  it("does not add grounding issues when every quote is found in the text", () => {
    const contract = completePurchase();
    contract.object.area.source = { page: 1, quote: "4.7 ha" };
    contract.financials.price.source = { page: 1, quote: "Pirkuma cena ir 25000 EUR" };
    contract.financials.vat.source = { page: 1, quote: "Pirkuma cena ir 25000 EUR" };
    contract.parties[0].representative.source = null;
    contract.parties[0].representative.value = null;
    contract.parties[0].iban.value = null;
    contract.parties[0].iban.source = null;
    contract.document.title.source = { page: 1, quote: "Pirkuma cena" };
    contract.parties[0].role.source = { page: 1, quote: "Pārdevējs" };
    contract.parties[1].role.source = { page: 1, quote: "Pircējs" };
    contract.specialConditions[0].quote = "Pircējs iesniedz nostiprinājuma lūgumu";
    const result = validateContract(contract, sourceText);
    const grounding = result.issues.filter((issue) =>
      ["quote-not-found", "quote-inexact", "missing-evidence", "page-out-of-range"].includes(
        issue.code,
      ),
    );
    expect(grounding).toEqual([]);
    expect(result.issues.filter((issue) => issue.path === "financials.price")).toEqual([]);
    expect(result.issues.map((issue) => issue.code)).not.toContain("quote-not-found");
    expect(result.issues.map((issue) => issue.code)).not.toContain("page-out-of-range");
  });

  it("flags a fabricated value whose quote and page do not exist", () => {
    const contract = completePurchase();
    contract.financials.price = {
      value: { amount: 99_999, currency: "EUR", netAmount: null, grossAmount: null },
      confidence: 0.95,
      source: { page: 999, quote: "Pirkuma cena ir 99 999 EUR bez PVN" },
    };
    const result = validateContract(contract, sourceText);
    expect(result.needsReview).toBe(true);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "quote-not-found", path: "financials.price" }),
        expect.objectContaining({ code: "page-out-of-range", path: "financials.price" }),
      ]),
    );
  });

  it("flags a value that has no quote at all", () => {
    const contract = completePurchase();
    contract.financials.price.source = null;
    const result = validateContract(contract, sourceText);
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "missing-evidence", path: "financials.price" }),
      ]),
    );
  });

  it("accepts Latvian inflections and trailing punctuation as an inexact match", () => {
    expect(groundQuote("Līgumsods 0,1 % dienā.", sourceText)).toBe("exact");
    expect(groundQuote("līgumsodu 0,1 % dienā", sourceText)).toBe("inexact");
    expect(groundQuote("Pircējs iesniedz nostiprinājuma lūgumu.", sourceText)).toBe("exact");
    expect(groundQuote("Nomas maksa ir 650 EUR mēnesī", sourceText)).toBe("not-found");
  });

  it("does not check grounding when no source text is supplied", () => {
    const contract = completePurchase();
    contract.financials.price.source = null;
    expect(validateContract(contract).issues.map((issue) => issue.code)).not.toContain(
      "missing-evidence",
    );
  });
});
