import { createHash } from "node:crypto";

export function journalOwner() {
  // The existing deployment key identifies the journal's stored rows.
  const legacyKey = process.env.OWNER_KEY;
  if (!legacyKey) {
    return process.env.NODE_ENV === "development" ? "local-development" : null;
  }
  return createHash("sha256").update(legacyKey).digest("hex");
}

export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const parsed = new URL(origin);
    return (
      parsed.host === request.headers.get("host") &&
      (parsed.protocol === "https:" ||
        (process.env.NODE_ENV === "development" && parsed.protocol === "http:"))
    );
  } catch {
    return false;
  }
}
