export interface DocumentChunkDraft {
  content: string;
  pageNumber: number;
  chunkIndex: number;
}

export const DEFAULT_CHUNK_SIZE = 1000;
export const DEFAULT_CHUNK_OVERLAP = 200;

/**
 * Splits extracted page text into overlapping chunks.
 * Preserves page numbers and generates deterministic chunk indexes.
 */
export function chunkText(
  pages: { pageNumber: number; text: string }[],
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): DocumentChunkDraft[] {
  const chunks: DocumentChunkDraft[] = [];
  let chunkIndex = 0;

  // Safeguard against infinite loops
  if (overlap >= chunkSize) {
    throw new Error("Overlap must be strictly less than chunk size.");
  }
  if (chunkSize <= 0) {
    throw new Error("Chunk size must be positive.");
  }

  for (const page of pages) {
    const text = page.text.trim();
    if (!text) continue; // Skip empty pages

    let startIndex = 0;
    while (startIndex < text.length) {
      let endIndex = startIndex + chunkSize;
      let chunkContent = text.slice(startIndex, endIndex);

      // Try to break at a word boundary (space) if we aren't at the end of the text
      if (endIndex < text.length) {
        const lastSpaceIndex = chunkContent.lastIndexOf(' ');
        // Only break at space if it's far enough from the start to justify it
        // (We don't want to make tiny chunks just to hit a space)
        if (lastSpaceIndex > overlap) {
          endIndex = startIndex + lastSpaceIndex;
          chunkContent = text.slice(startIndex, endIndex);
        }
      }

      const trimmedContent = chunkContent.trim();
      if (trimmedContent) {
        chunks.push({
          content: trimmedContent,
          pageNumber: page.pageNumber,
          chunkIndex: chunkIndex++,
        });
      }

      // Advance the start index by chunk size minus overlap
      // If we adjusted endIndex to a space, we still overlap from that new endIndex
      startIndex = endIndex - overlap;
    }
  }

  return chunks;
}
