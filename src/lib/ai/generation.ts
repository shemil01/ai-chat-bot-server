import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { getRagSystemPrompt } from "./prompts.js";

export const GENERATION_MODEL = "gemini-3.5-flash";

export interface GenerateAnswerParams {
  question: string;
  contextString: string;
}

/**
 * Calls the Gemini API to generate a grounded answer based strictly on the provided context.
 * The contextString should be safely formatted (e.g., via buildContext).
 * 
 * Note: This uses generateText for Day 6 testing. Day 7 will adapt this architecture for streamText.
 */
export async function generateGroundedAnswer({ question, contextString }: GenerateAnswerParams): Promise<string> {
  // If there is no usable context, we fast-fail cleanly as per RAG principles
  if (!contextString || contextString.includes("<document_context>\n\n</document_context>")) {
    return "I cannot find the answer in the provided document.";
  }

  const prompt = `DOCUMENT CONTEXT:\n${contextString}\n\nUSER QUESTION:\n${question}`;

  try {
    const { text } = await generateText({
      model: google(GENERATION_MODEL),
      system: getRagSystemPrompt(),
      prompt,
      temperature: 0.1, // Low temperature for factual, grounded answers
    });

    return text;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw new Error("An error occurred while generating the answer from the AI model.");
  }
}
