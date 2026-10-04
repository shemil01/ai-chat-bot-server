import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { streamText, UIMessage, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { retrieveRelevantChunks } from '../lib/rag/retrieval.js';
import { buildContext } from '../lib/rag/context-builder.js';
import { getRagSystemPrompt } from '../lib/ai/prompts.js';
import { GENERATION_MODEL } from '../lib/ai/generation.js';
import prisma from '../lib/db/prisma.js';

@Controller('api/chat')
export class ChatController {
  @Post()
  async chat(@Body() body: any, @Res() res: any) {
    try {
      const { messages, documentId } = body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "Messages array is required and cannot be empty" });
      }

      // General chat if no documentId is provided
      if (!documentId || typeof documentId !== "string") {
        const modelMessages = await convertToModelMessages(messages);

        const result = streamText({
          model: google(GENERATION_MODEL),
          system: `
You are DocuMind AI, a highly intelligent and specialized personal assistant.
NEVER say you are Gemini, Bard, or a language model trained by Google. If asked who you are, say you are the DocuMind AI Assistant built to help the user analyze documents and answer questions.
Answer the user's questions clearly and naturally.
You can answer general questions without requiring a document.
Do not pretend that a document was provided when there is no document.
      `,
          messages: modelMessages,
          temperature: 0.7,
        });

        return result.pipeTextStreamToResponse(res);
      }

      const lastMessage = messages[messages.length - 1] as UIMessage;
      const userTextPart = lastMessage?.parts?.find(p => p.type === 'text') as any;
      const query = userTextPart?.text || "";

      if (!lastMessage || lastMessage.role !== "user" || !query) {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "The latest message must be a valid user query" });
      }

      // 2. Document existence/status check
      const document = await prisma.document.findUnique({
        where: { id: documentId }
      });

      if (!document) {
        return res.status(HttpStatus.NOT_FOUND).json({ error: "Document not found" });
      }
      if (document.status === "PROCESSING") {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "This document is still being processed. Please try again shortly." });
      }
      if (document.status !== "READY") {
        return res.status(HttpStatus.BAD_REQUEST).json({ error: "This document is not ready for querying." });
      }

      // 3. Vector Retrieval
      const retrievedChunks = await retrieveRelevantChunks(documentId, query, 5);

      // 4. Build Context
      const contextString = buildContext(retrievedChunks);

      // 5. Build prompt
      const prompt = `DOCUMENT CONTEXT:\n${contextString}\n\nUSER QUESTION:\n${query}`;

      // 6. Extract source metadata (Unique page numbers)
      const uniquePages = Array.from(new Set(retrievedChunks.map(c => c.pageNumber))).sort((a, b) => a - b);
      res.setHeader("x-sources", JSON.stringify(uniquePages));

      if (retrievedChunks.length === 0) {
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        return res.send('0:"I cannot find the answer in the provided document."\n');
      }

      // 7. Generation and Streaming
      const result = streamText({
        model: google(GENERATION_MODEL),
        system: getRagSystemPrompt(),
        prompt: prompt,
        temperature: 0.1,
      });

      return result.pipeTextStreamToResponse(res);

    } catch (error: unknown) {
      console.error("Chat API Error:", error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: "We couldn't process your request. Please try again." });
    }
  }
}
