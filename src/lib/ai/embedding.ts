import { embedMany } from 'ai';
import { google } from '@ai-sdk/google';

export const EMBEDDING_MODEL = 'gemini-embedding-001';
export const EMBEDDING_DIMENSION = 3072;

/**
 * Batches text inputs and generates embeddings using Gemini text-embedding-004.
 * Batching prevents hitting payload limits and improves performance.
 */
export async function generateEmbeddings(texts: string[], batchSize: number = 100): Promise<number[][]> {
  if (texts.length === 0) return [];

  const embeddings: number[][] = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    
    // We use the @ai-sdk/google provider directly
    const { embeddings: batchEmbeddings } = await embedMany({
      model: google.embedding(EMBEDDING_MODEL),
      values: batch,
    });
    
    // Validate dimension
    for (const vector of batchEmbeddings) {
      if (vector.length !== EMBEDDING_DIMENSION) {
        throw new Error(
          `Embedding dimension mismatch. Expected ${EMBEDDING_DIMENSION}, got ${vector.length}. ` +
          `Database schema and pgvector index require exact dimension match.`
        );
      }
    }
    
    embeddings.push(...batchEmbeddings);
  }
  
  return embeddings;
}
