import { z } from "zod";

const catalogSchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      context_length: z.number().nullable().optional(),
      pricing: z.object({
        prompt: z.string().optional(),
        completion: z.string().optional(),
      }),
      architecture: z
        .object({
          input_modalities: z.array(z.string()).optional(),
          output_modalities: z.array(z.string()).optional(),
        })
        .optional(),
      supported_parameters: z.array(z.string()).nullable().optional(),
    }),
  ),
});

function price(value: string | undefined): number {
  if (value === undefined) return Number.POSITIVE_INFINITY;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : Number.POSITIVE_INFINITY;
}

const response = await fetch("https://openrouter.ai/api/v1/models");
if (!response.ok) {
  throw new Error(`OpenRouter modeļu saraksts nav pieejams (${response.status}).`);
}

const catalog = catalogSchema.parse(await response.json());
const models = catalog.data
  .filter((model) => {
    const parameters = model.supported_parameters ?? [];
    const inputs = model.architecture?.input_modalities ?? [];
    const outputs = model.architecture?.output_modalities ?? [];
    return (
      (parameters.includes("structured_outputs") || parameters.includes("response_format")) &&
      inputs.includes("text") &&
      outputs.includes("text") &&
      !model.id.endsWith(":batch") &&
      Number.isFinite(price(model.pricing.prompt)) &&
      Number.isFinite(price(model.pricing.completion))
    );
  })
  .map((model) => ({
    id: model.id,
    name: model.name,
    contextLength: model.context_length ?? null,
    promptUsdPerMillion: price(model.pricing.prompt) * 1_000_000,
    completionUsdPerMillion: price(model.pricing.completion) * 1_000_000,
  }))
  .sort(
    (left, right) =>
      left.promptUsdPerMillion +
      left.completionUsdPerMillion -
      (right.promptUsdPerMillion + right.completionUsdPerMillion),
  );

console.table(models.slice(0, 50));
