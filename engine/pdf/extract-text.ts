import { extractTextItems } from "unpdf";
import {
  assembleExtractedPdfText,
  type ExtractedPdfText,
  type PdfTextItem,
} from "./extract-text.shared";

export type {
  ExtractedPdfText,
  PdfTextItem,
  PdfTextLine,
} from "./extract-text.shared";

/** Extract positioned text in Node using unpdf's serverless PDF.js build. */
export async function extractPdfText(input: Uint8Array | ArrayBuffer): Promise<ExtractedPdfText> {
  const data = input instanceof Uint8Array ? new Uint8Array(input) : new Uint8Array(input.slice(0));
  const extracted = await extractTextItems(data);
  const items: PdfTextItem[] = extracted.items.flatMap((pageItems, pageIndex) =>
    pageItems.map((item) => ({
      page: pageIndex + 1,
      x: item.x,
      y: item.y,
      str: item.str,
      width: item.width,
      height: item.height,
    })),
  );

  return assembleExtractedPdfText(items, extracted.totalPages);
}

export const extractTextFromPdf = extractPdfText;
export const extractPdfTextNode = extractPdfText;
