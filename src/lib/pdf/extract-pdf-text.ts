import { getDocumentProxy } from "unpdf";
import { DOCUMENT_LIMITS } from "../validation/document.js";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

export interface ExtractionResult {
  pageCount: number;
  pages: ExtractedPage[];
  fullText: string;
  totalCharacters: number;
}

export async function extractPdfText(buffer: Uint8Array): Promise<ExtractionResult> {
  // Use unpdf to parse the PDF document
  const pdf = await getDocumentProxy(buffer);
  const pageCount = pdf.numPages;

  if (pageCount > DOCUMENT_LIMITS.MAX_PAGES) {
    throw new Error(`PDF exceeds maximum allowed pages (${DOCUMENT_LIMITS.MAX_PAGES})`);
  }

  const pages: ExtractedPage[] = [];
  let totalCharacters = 0;
  let fullText = "";

  // Extract text page by page (1-based index)
  for (let i = 1; i <= pageCount; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    
    // Join items with a space, then normalize whitespace
    let pageText = textContent.items
      .map((item: any) => item.str || "")
      .join(" ");

    // Normalize whitespace (replace multiple spaces/newlines with a single space)
    pageText = pageText.replace(/\s+/g, " ").trim();

    pages.push({
      pageNumber: i,
      text: pageText,
    });

    totalCharacters += pageText.length;
    
    if (pageText) {
      fullText += (fullText ? "\n\n" : "") + pageText;
    }
  }

  return {
    pageCount,
    pages,
    fullText,
    totalCharacters,
  };
}
