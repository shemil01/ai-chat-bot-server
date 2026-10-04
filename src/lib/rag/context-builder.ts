import { RetrievedChunk } from "./retrieval.js";

/**
 * Converts an array of retrieved document chunks into a structured string 
 * formatted safely for the LLM. It includes explicit tags to prevent prompt injection 
 * and preserves metadata boundaries so the model understands it is reading multiple excerpts.
 */
export function buildContext(chunks: RetrievedChunk[]): string {
  if (!chunks || chunks.length === 0) {
    return "<document_context>\n\n</document_context>";
  }

  const formattedChunks = chunks.map((chunk) => {
    return `<source page="${chunk.pageNumber}" chunk="${chunk.chunkIndex}">\n${chunk.content}\n</source>`;
  });

  return `<document_context>\n${formattedChunks.join('\n\n')}\n</document_context>`;
}
