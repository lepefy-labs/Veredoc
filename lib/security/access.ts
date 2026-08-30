import { timingSafeEqual } from "node:crypto";

export function isJobRequestAuthorized(
  authorizationHeader: string | null,
  secret = process.env.JOBS_SECRET
): boolean {
  if (!secret || !authorizationHeader?.startsWith("Bearer ")) return false;

  const provided = authorizationHeader.slice("Bearer ".length);
  if (!provided) return false;

  const expectedBuffer = Buffer.from(secret);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, providedBuffer);
}

export function isDocumentOwner(sessionUserId: string | undefined, documentUserId: string): boolean {
  return Boolean(sessionUserId && sessionUserId === documentUserId);
}
