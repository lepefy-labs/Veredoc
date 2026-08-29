export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png"] as const;
export type AcceptedMimeType = (typeof ACCEPTED_MIME_TYPES)[number];

export function detectMimeType(buffer: Buffer): AcceptedMimeType | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

export function validateDocumentBuffer(buffer: Buffer, expectedMimeType?: string): AcceptedMimeType {
  if (buffer.length === 0) throw new Error("Il file è vuoto.");
  if (buffer.length > MAX_FILE_SIZE_BYTES) throw new Error("File troppo grande. Massimo 10MB.");

  const detected = detectMimeType(buffer);
  if (!detected) throw new Error("Tipo file non supportato. Usa PDF, JPG o PNG.");
  if (expectedMimeType && ACCEPTED_MIME_TYPES.includes(expectedMimeType as AcceptedMimeType) && expectedMimeType !== detected) {
    throw new Error("Il contenuto del file non corrisponde al tipo dichiarato.");
  }
  return detected;
}

export function safeExtension(mimeType: AcceptedMimeType): "pdf" | "jpg" | "png" {
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType === "image/jpeg") return "jpg";
  return "png";
}
