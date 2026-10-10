// Destinazioni post-login: solo percorsi interni dell'applicazione.
// Impedisce open redirect (URL assoluti, "//host", backslash, schemi).

const ALLOWED_PREFIXES = ["/analyze", "/dashboard"];

// `sameOrigin`: origine corrente; consente callbackUrl assoluti generati da NextAuth
// solo se puntano alla stessa origine.
export function safeCallbackPath(
  value: string | null | undefined,
  fallback = "/dashboard",
  sameOrigin?: string
): string {
  if (!value || value.length > 1024) return fallback;
  if (sameOrigin && /^https?:\/\//i.test(value)) {
    try {
      const absolute = new URL(value);
      if (absolute.origin !== new URL(sameOrigin).origin) return fallback;
      value = `${absolute.pathname}${absolute.search}`;
    } catch {
      return fallback;
    }
  }
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(value, "https://internal.invalid");
  } catch {
    return fallback;
  }
  if (parsed.origin !== "https://internal.invalid") return fallback;

  const allowed = ALLOWED_PREFIXES.some((prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(`${prefix}/`));
  return allowed ? `${parsed.pathname}${parsed.search}` : fallback;
}

export function buildLoginRedirectPath(pathname: string, search: string): string {
  const target = safeCallbackPath(`${pathname}${search}`, "");
  return target ? `/login?callbackUrl=${encodeURIComponent(target)}` : "/login";
}
