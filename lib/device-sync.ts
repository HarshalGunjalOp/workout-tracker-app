export const deviceKeyStorage = "form-device-key";

export function savedDeviceKey() {
  try {
    return localStorage.getItem(deviceKeyStorage);
  } catch {
    return null;
  }
}

export function deviceKeyFromLink(input: string, origin: string) {
  try {
    const url = new URL(input);
    if (url.origin !== origin || url.pathname !== "/") return null;
    return new URLSearchParams(url.hash.slice(1)).get("key") || null;
  } catch {
    return null;
  }
}

export async function syncRequest(
  send: typeof fetch,
  path: string,
  init?: RequestInit,
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    return await send(path, {
      ...init,
      cache: "no-store",
      redirect: "error",
      referrerPolicy: "same-origin",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

// Only the journal and program APIs can receive the saved device credential.
export function deviceRequest(
  send: typeof fetch,
  key: () => string | null,
  path: "/api/sessions" | "/api/program" | "/api/program?version=2",
  init?: RequestInit,
) {
  const credential = key();
  if (!credential) return syncRequest(send, path, init);

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${credential}`);
  return syncRequest(send, path, { ...init, headers });
}

export function pairDevice(send: typeof fetch, key: string) {
  return syncRequest(send, "/api/pair", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
}
