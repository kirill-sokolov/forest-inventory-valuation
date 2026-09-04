import { GlobalWorkerOptions, getDocument } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

GlobalWorkerOptions.workerSrc = workerUrl;

export class ContractPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContractPdfError";
  }
}

export async function extractContractPdfText(file: File): Promise<string> {
  const looksLikePdf =
    file.type === "application/pdf" ||
    (file.type === "" && file.name.toLowerCase().endsWith(".pdf"));
  if (!looksLikePdf) {
    throw new ContractPdfError("Izvēlieties PDF failu.");
  }

  const loadingTask = getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
  try {
    const pdf = await loadingTask.promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      pages.push(`[PAGE ${pageNumber}]\n${text}`);
    }
    const result = pages.join("\n\n").trim();
    if (!result.replace(/\[PAGE \d+\]/g, "").trim()) {
      throw new ContractPdfError(
        "PDF failā nav teksta slāņa. Izmantojiet dokumentu ar atlasāmu tekstu vai pārbaudiet datus manuāli.",
      );
    }
    return result;
  } catch (error) {
    if (error instanceof ContractPdfError) throw error;
    throw new ContractPdfError("PDF tekstu neizdevās nolasīt.");
  } finally {
    await loadingTask.destroy();
  }
}
