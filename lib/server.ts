import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
export const hash = (s: string) => createHash("sha256").update(s).digest("hex");
export async function owner() {
  const key = process.env.OWNER_KEY;
  if (!key)
    return process.env.NODE_ENV === "development" ? "local-development" : null;
  const token = (await cookies()).get("form-device")?.value;
  return token && safeEqual(token, hash(key)) ? hash(key) : null;
}
export function safeEqual(a: string, b: string) {
  const aa = Buffer.from(a),
    bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
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
