

// Configurable limits
export const DOCUMENT_LIMITS = {
  MAX_FILE_SIZE_MB: 10,
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
  MAX_PAGES: 100,
  MIN_MEANINGFUL_TEXT_LENGTH: 50, // Minimum characters to consider the PDF useful
};

// Error codes for consistent API responses
export const ErrorCodes = {
  MISSING_FILE: "MISSING_FILE",
  INVALID_FILE_TYPE: "INVALID_FILE_TYPE",
  FILE_TOO_LARGE: "FILE_TOO_LARGE",
  INVALID_PDF_SIGNATURE: "INVALID_PDF_SIGNATURE",
  TOO_MANY_PAGES: "TOO_MANY_PAGES",
  NO_EXTRACTABLE_TEXT: "NO_EXTRACTABLE_TEXT",
  PROCESSING_ERROR: "PROCESSING_ERROR",
} as const;

// Helper to check PDF magic bytes (%PDF-)
export function hasPdfSignature(buffer: Buffer | Uint8Array): boolean {
  // %PDF- is 25 50 44 46 2D in hex
  if (buffer.length < 5) return false;
  return (
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46 &&
    buffer[4] === 0x2d
  );
}
