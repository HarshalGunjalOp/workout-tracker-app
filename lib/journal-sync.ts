import { mergeSessions, type Session } from "./training.ts";

type Options = {
  read: () => Session[];
  write: (sessions: Session[]) => void;
  status: (status: string) => void;
  key: () => string | null;
  fetch: typeof fetch;
};

// One durable device journal, one in-flight sync. Edits during a request queue
// another pass; failed requests leave every unacknowledged session on device.
export function createJournalSync(options: Options) {
  const acknowledged = new Map<string, string>();
  let running = false, queued = false, stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const signature = (session: Session) => JSON.stringify(session);
  async function request(path: string, init?: RequestInit): Promise<Response> {
    const send = () => options.fetch(path, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
    let response = await send();
    if (response.status === 401) {
      const key = options.key();
      if (key) {
        const pair = await options.fetch("/api/pair", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key }), signal: AbortSignal.timeout(15000),
        });
        if (pair.ok) response = await send();
      }
    }
    return response;
  }
  function schedule(delay = 400) {
    if (stopped) return;
    if (running) { queued = true; return; }
    // Do not postpone a save indefinitely while the user keeps logging sets.
    if (timer && delay > 0) return;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => { timer = undefined; void flush(); }, delay);
  }
  async function flush() {
    if (stopped) return;
    if (running) { queued = true; return; }
    if (timer) { clearTimeout(timer); timer = undefined; }
    running = true;
    let retry = false;
    options.status("Saving");
    try {
      const response = await request("/api/sessions");
      if (!response.ok) {
        options.status(response.status === 401 ? "Device only" : "Offline");
        retry = true;
        return;
      }
      const remote: Session[] = await response.json();
      if (stopped) return;
      // Replace acknowledgements on every read: a missing server record must
      // be uploaded again even if an earlier request had acknowledged it.
      acknowledged.clear();
      remote.forEach(s => acknowledged.set(s.id, signature(s)));
      const merged = mergeSessions(options.read(), remote);
      if (JSON.stringify(merged) !== JSON.stringify(options.read())) options.write(merged);
      const pending = merged.filter(s => acknowledged.get(s.id) !== signature(s))
        .sort((a, b) => Number(!!b.finishedAt && !b.discardedAt) - Number(!!a.finishedAt && !a.discardedAt));
      for (const session of pending) {
        if (stopped) return;
        const saved = await request("/api/sessions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(session), keepalive: true,
        });
        if (!saved.ok) {
          retry = true;
          options.status(saved.status === 401 ? "Device only" : saved.status === 400 ? "Some changes need attention" : "Offline");
          // A bad old draft must never block other completed workouts.
          if (saved.status === 400) continue;
          return;
        }
        acknowledged.set(session.id, signature(session));
      }
      if (stopped) return;
      const remaining = options.read().some(s => acknowledged.get(s.id) !== signature(s));
      if (!retry) options.status(remaining ? "Saving" : "Synced");
      if (remaining && !retry) queued = true;
    } catch {
      if (!stopped) options.status("Offline");
      retry = true;
    } finally {
      running = false;
      if (!stopped && (queued || retry)) {
        queued = false;
        schedule(retry ? 5000 : 0);
      }
    }
  }
  return {
    schedule,
    flush,
    stop() { stopped = true; if (timer) clearTimeout(timer); },
  };
}
