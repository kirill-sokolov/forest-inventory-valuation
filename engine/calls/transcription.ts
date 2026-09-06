import { z } from "zod";

// docs/spec.md §Task 3 — MP3 transcription extension. Base64 adds roughly one third.
export const MAX_CALL_AUDIO_BYTES = 3_200_000;
export const MAX_CALL_AUDIO_SECONDS = 600;
export const MAX_CALL_TRANSCRIPT_BYTES = 100_000;

export const transcriptionResponseSchema = z
  .object({
    transcript: z
      .string()
      .trim()
      .min(1)
      .refine((value) => new TextEncoder().encode(value).byteLength <= MAX_CALL_TRANSCRIPT_BYTES),
    durationSec: z.number().int().min(1).max(MAX_CALL_AUDIO_SECONDS),
    warnings: z.array(z.string().max(500)).max(20),
  })
  .strict();

export type TranscriptionResponse = z.infer<typeof transcriptionResponseSchema>;
