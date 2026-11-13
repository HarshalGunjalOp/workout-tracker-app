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
