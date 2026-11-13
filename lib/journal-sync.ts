import { deviceRequest } from "./device-sync.ts";
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
  const signature = (session: Session) => JSON.stringify(session, (_key, value) =>
    value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)))
      : value,
  );
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
    let rejected = false;
    options.status("Saving");
    try {
      const response = await deviceRequest(options.fetch, options.key, "/api/sessions");
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
        const saved = await deviceRequest(options.fetch, options.key, "/api/sessions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          // The browser's keepalive quota is smaller than a valid workout.
          body: JSON.stringify(session),
        });
        if (!saved.ok) {
          retry = true;
          // A rejection for one workout must not hold up the rest of the journal.
          if (saved.status === 400 || saved.status === 409 || saved.status === 413) {
            rejected = true;
            continue;
          }
          options.status(saved.status === 401 ? "Device only" : "Offline");
          return;
        }
        const { session: stored } = await saved.json() as { session?: Session };
        if (stopped) return;
        if (stored?.id !== session.id || stored.updatedAt !== session.updatedAt) {
          retry = true;
          continue;
        }
        acknowledged.set(stored.id, signature(stored));
        // The server can normalize a payload. Apply that copy only if no local
        // edit replaced the version sent with this request.
        const local = options.read();
        if (signature(stored) !== signature(session) &&
            local.some(item => item.id === session.id && signature(item) === signature(session))) {
          options.write(local.map(item => item.id === stored.id ? stored : item));
        }
      }
      if (stopped) return;
      const remaining = options.read().some(s => acknowledged.get(s.id) !== signature(s));
      if (rejected) options.status("Some changes need attention");
      else if (retry) options.status("Cloud verification pending");
      else options.status(remaining ? "Saving" : "Synced");
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
