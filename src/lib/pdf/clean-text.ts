/**
 * Cleans and normalizes extracted text from a PDF.
 * Removes excessive whitespace, control characters, and normalizes unicode,
 * without destroying meaningful punctuation or paragraph structure.
 */
export function cleanText(text: string): string {
  if (!text) return "";

  return text
    // Normalize unicode characters (e.g. smart quotes, specific dashes)
    .normalize('NFKC')
    // Remove null bytes and control characters (except newlines and tabs)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Replace multiple spaces or tabs with a single space
    .replace(/[ \t]+/g, ' ')
    // Replace 3 or more consecutive newlines with exactly 2 newlines (paragraph boundary)
    .replace(/\n{3,}/g, '\n\n')
    // Trim leading/trailing whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Finally, trim the entire string
    .trim();
}
