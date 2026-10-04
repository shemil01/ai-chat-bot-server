import { Controller, Post, Get, Param, Delete, UseInterceptors, UploadedFile, Res, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DOCUMENT_LIMITS, ErrorCodes, hasPdfSignature } from '../lib/validation/document.js';
import { extractPdfText } from '../lib/pdf/extract-pdf-text.js';
import { cleanText } from '../lib/pdf/clean-text.js';
import { chunkText } from '../lib/rag/chunk-text.js';
import { generateEmbeddings } from '../lib/ai/embedding.js';
import prisma from '../lib/db/prisma.js';

@Controller('api/documents')
export class DocumentsController {
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: any, @Res() res: any) {
    let documentId: string | null = null;
    try {
      if (!file) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: { code: ErrorCodes.MISSING_FILE, message: "No file provided in the request." } });
      }

      if (file.size === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: { code: ErrorCodes.INVALID_FILE_TYPE, message: "The selected file is empty." } });
      }
      
      if (file.size > DOCUMENT_LIMITS.MAX_FILE_SIZE_BYTES) {
        return res.status(HttpStatus.PAYLOAD_TOO_LARGE).json({ error: { code: ErrorCodes.FILE_TOO_LARGE, message: `File size exceeds the limit of ${DOCUMENT_LIMITS.MAX_FILE_SIZE_MB}MB.` } });
      }

      if (file.mimetype !== "application/pdf") {
        return res.status(HttpStatus.UNSUPPORTED_MEDIA_TYPE).json({ error: { code: ErrorCodes.INVALID_FILE_TYPE, message: "Only PDF files are supported." } });
      }

      const buffer = new Uint8Array(file.buffer);
      if (!hasPdfSignature(buffer)) {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({ error: { code: ErrorCodes.INVALID_PDF_SIGNATURE, message: "The file is not a valid PDF document based on its contents." } });
      }

      // Step 1: Create Document as PROCESSING
      const doc = await prisma.document.create({
        data: {
          filename: file.originalname,
          status: "PROCESSING",
        }
      });
      documentId = doc.id;

      // Step 2: Extraction
      const extractionResult = await extractPdfText(buffer);
      
      if (extractionResult.totalCharacters < DOCUMENT_LIMITS.MIN_MEANINGFUL_TEXT_LENGTH) {
        throw new Error("NO_EXTRACTABLE_TEXT");
      }

      // Step 3: Cleaning
      const cleanedPages = extractionResult.pages.map(p => ({
        pageNumber: p.pageNumber,
        text: cleanText(p.text)
      }));

      // Step 4: Chunking
      const chunks = chunkText(cleanedPages);
      if (chunks.length === 0) {
        throw new Error("NO_EXTRACTABLE_TEXT");
      }

      // Step 5: Embeddings
      const textsToEmbed = chunks.map(c => c.content);
      const embeddings = await generateEmbeddings(textsToEmbed);

      // Step 6: Store Chunks + Embeddings
      await prisma.$transaction(
        chunks.map((chunk, index) => {
          const embedding = embeddings[index];
          const embeddingStr = `[${embedding.join(',')}]`;
          return prisma.$executeRawUnsafe(`
            INSERT INTO "DocumentChunk" ("id", "documentId", "content", "pageNumber", "chunkIndex", "embedding")
            VALUES (gen_random_uuid(), '${documentId}', $1, ${chunk.pageNumber}, ${chunk.chunkIndex}, '${embeddingStr}'::vector)
          `, chunk.content);
        })
      );

      // Step 7: Mark as READY
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "READY" }
      });

      return res.status(HttpStatus.OK).json({
        id: documentId,
        filename: file.originalname,
        status: "READY",
        pageCount: extractionResult.pageCount,
        totalCharacters: extractionResult.totalCharacters,
        chunksCreated: chunks.length,
      });

    } catch (error: unknown) {
      const err = error as Error;
      console.error("Upload API Error:", err);
      if (documentId) {
        await prisma.document.update({ where: { id: documentId }, data: { status: "FAILED" } }).catch(() => {});
      }
      const errorMsg = err.message || "";
      if (errorMsg === "NO_EXTRACTABLE_TEXT") {
        return res.status(HttpStatus.UNPROCESSABLE_ENTITY).json({ error: { code: ErrorCodes.NO_EXTRACTABLE_TEXT, message: "The PDF appears to contain no extractable text." } });
      }
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: { code: "INTERNAL_ERROR", message: `Ingestion Error: ${err.message}` } });
    }
  }

  @Get()
  async getDocuments() {
    return prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });
  }

  @Delete(':id')
  async deleteDocument(@Param('id') id: string) {
    await prisma.document.delete({ where: { id } });
    return { success: true };
  }
}
