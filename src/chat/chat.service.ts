import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: DatabaseService) {}

  async retrieveRelevantChunks(documentId: string, query: string, k: number = 5) {
    // 1. Generate query embedding using Google Gemini
    // 2. Perform raw Prisma pgvector search on DocumentChunk table
    return [];
  }

  buildContext(chunks: any[]) {
    return chunks.map(c => `[Page ${c.pageNumber}]: ${c.text}`).join('\n\n');
  }
}
