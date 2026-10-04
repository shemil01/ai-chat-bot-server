import prisma from "../db/prisma.js";
import { generateEmbeddings } from "../ai/embedding.js";

export interface RetrievedChunk {
  id: string;
  documentId: string;
  content: string;
  pageNumber: number;
  chunkIndex: number;
  distance: number;
}

/**
 * Retrieves the Top-K most semantically relevant document chunks for a given query.
 * Restricts the search entirely to the provided documentId.
 */
export async function retrieveRelevantChunks(
  documentId: string,
  query: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  // 1. Basic validation
  if (!documentId || typeof documentId !== 'string') {
    throw new Error("Invalid document ID.");
  }
  const cleanQuery = query.trim();
  if (!cleanQuery) {
    throw new Error("Query cannot be empty.");
  }
  if (topK < 1 || topK > 50) {
    throw new Error("TopK must be a positive integer between 1 and 50.");
  }

  // 2. Check document existence and status
  const document = await prisma.document.findUnique({
    where: { id: documentId }
  });

  if (!document) {
    throw new Error("Document not found.");
  }

  if (document.status !== "READY") {
    throw new Error("Document is not ready for retrieval.");
  }

  // 3. Embed the query using the exact same configuration as ingestion
  // generateEmbeddings returns a 2D array, we only passed 1 string so we take index 0
  const [queryEmbedding] = await generateEmbeddings([cleanQuery]);

  if (!queryEmbedding || queryEmbedding.length === 0) {
    throw new Error("Failed to generate embedding for the query.");
  }

  // 4. Perform vector search using cosine distance (<=>)
  // We use Prisma's $queryRaw with parameterized variables to strictly prevent SQL injection.
  // We explicitly cast the embedding to ::vector to satisfy PostgreSQL's pgvector extension.
  // The ORDER BY ASC ensures the smallest distance (most similar) ranks first.
  const queryEmbeddingStr = `[${queryEmbedding.join(',')}]`;
  const results = await prisma.$queryRaw<RetrievedChunk[]>`
    SELECT 
      id, 
      "documentId", 
      content, 
      "pageNumber", 
      "chunkIndex",
      (embedding <=> ${queryEmbeddingStr}::vector) AS distance
    FROM "DocumentChunk"
    WHERE "documentId" = ${documentId}
    ORDER BY embedding <=> ${queryEmbeddingStr}::vector ASC
    LIMIT ${topK};
  `;

  return results || [];
}
