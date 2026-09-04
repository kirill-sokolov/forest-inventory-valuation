import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
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

GlobalWorkerOptions.workerSrc = workerUrl;

interface BrowserTextItem {
  str: string;
  transform: number[];
  width: number;
  height: number;
}

function isBrowserTextItem(value: unknown): value is BrowserTextItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "str" in value &&
    typeof value.str === "string" &&
    "transform" in value &&
    Array.isArray(value.transform)
  );
}

/** Extract positioned text in the browser using the Vite-pinned PDF.js worker. */
export async function extractPdfTextBrowser(
  input: Uint8Array | ArrayBuffer,
): Promise<ExtractedPdfText> {
  const data = input instanceof Uint8Array ? new Uint8Array(input) : new Uint8Array(input.slice(0));
  const loadingTask = getDocument({ data });
  const document = await loadingTask.promise;
  const items: PdfTextItem[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();

      for (const item of content.items) {
        if (!isBrowserTextItem(item)) {
          continue;
        }
        items.push({
          page: pageNumber,
          x: item.transform[4] ?? 0,
          y: item.transform[5] ?? 0,
          str: item.str,
          width: item.width,
          height: item.height,
        });
      }
    }

    return assembleExtractedPdfText(items, document.numPages);
  } finally {
    await loadingTask.destroy();
  }
}

export const extractTextFromPdfBrowser = extractPdfTextBrowser;
export const extractPdfText = extractPdfTextBrowser;
