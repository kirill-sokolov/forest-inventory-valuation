import { z } from "zod";

export interface FieldSource {
  page: number | null;
  quote: string;
}

export interface Field<T> {
  value: T | null;
  confidence: number;
  source: FieldSource | null;
}

// Every key is required (nullable, not optional): OpenAI-compatible strict structured output
// rejects schemas whose properties are missing from `required`.
export const fieldSourceSchema = z.object({
  page: z.number().int().positive().nullable(),
  quote: z.string().min(1),
});

export function fieldSchema<T extends z.ZodType>(valueSchema: T) {
  return z.object({
    value: valueSchema.nullable(),
    confidence: z.number().min(0).max(1),
    source: fieldSourceSchema.nullable(),
  });
}

export const documentTypeSchema = z.enum(["purchase", "lease", "other"]);
export const partyRoleSchema = z.enum(["seller", "buyer", "lessor", "lessee", "other"]);

export const areaValueSchema = z.object({
  value: z.number(),
  unit: z.string().min(1),
});

export const moneyValueSchema = z.object({
  amount: z.number(),
  currency: z.string().min(1),
  // Optional paired values make the spec's gross/net VAT consistency check possible.
  netAmount: z.number().nullable(),
  grossAmount: z.number().nullable(),
});

export const rentValueSchema = moneyValueSchema.extend({
  period: z.string().min(1),
});

export const vatValueSchema = z.object({
  included: z.boolean(),
  rate: z.number().min(0),
});

export const specialConditionSchema = z.object({
  title: z.string().min(1),
  quote: z.string().min(1),
  page: z.number().int().positive().nullable(),
});

export const contractExtractionSchema = z.object({
  document: z.object({
    type: fieldSchema(documentTypeSchema),
    title: fieldSchema(z.string()),
    signedAt: fieldSchema(z.string()),
    place: fieldSchema(z.string()),
  }),
  parties: z.array(
    z.object({
      role: fieldSchema(partyRoleSchema),
      name: fieldSchema(z.string()),
      registrationNumber: fieldSchema(z.string()),
      personalCode: fieldSchema(z.string()),
      address: fieldSchema(z.string()),
      representative: fieldSchema(z.string()),
      iban: fieldSchema(z.string()),
    }),
  ),
  object: z.object({
    address: fieldSchema(z.string()),
    cadastreNumber: fieldSchema(z.string()),
    area: fieldSchema(areaValueSchema),
    description: fieldSchema(z.string()),
  }),
  financials: z.object({
    price: fieldSchema(moneyValueSchema),
    rent: fieldSchema(rentValueSchema),
    vat: fieldSchema(vatValueSchema),
    deposit: fieldSchema(moneyValueSchema),
    paymentDeadline: fieldSchema(z.string()),
    penalty: fieldSchema(z.string()),
  }),
  term: z.object({
    effectiveFrom: fieldSchema(z.string()),
    effectiveTo: fieldSchema(z.string()),
    durationMonths: fieldSchema(z.number().int().nonnegative()),
    noticePeriodDays: fieldSchema(z.number().int().nonnegative()),
    autoRenewal: fieldSchema(z.boolean()),
  }),
  // The assignment gives these as grounded snippets rather than Field<T> leaves.
  specialConditions: z.array(specialConditionSchema),
});

export type ContractExtraction = z.infer<typeof contractExtractionSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type MoneyValue = z.infer<typeof moneyValueSchema>;
export type RentValue = z.infer<typeof rentValueSchema>;

export function emptyField<T>(): Field<T> {
  return { value: null, confidence: 0, source: null };
}

export function createEmptyContract(): ContractExtraction {
  return {
    document: {
      type: emptyField<DocumentType>(),
      title: emptyField<string>(),
      signedAt: emptyField<string>(),
      place: emptyField<string>(),
    },
    parties: [],
    object: {
      address: emptyField<string>(),
      cadastreNumber: emptyField<string>(),
      area: emptyField<z.infer<typeof areaValueSchema>>(),
      description: emptyField<string>(),
    },
    financials: {
      price: emptyField<MoneyValue>(),
      rent: emptyField<RentValue>(),
      vat: emptyField<z.infer<typeof vatValueSchema>>(),
      deposit: emptyField<MoneyValue>(),
      paymentDeadline: emptyField<string>(),
      penalty: emptyField<string>(),
    },
    term: {
      effectiveFrom: emptyField<string>(),
      effectiveTo: emptyField<string>(),
      durationMonths: emptyField<number>(),
      noticePeriodDays: emptyField<number>(),
      autoRenewal: emptyField<boolean>(),
    },
    specialConditions: [],
  };
}
