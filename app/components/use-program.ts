"use client";
import { useEffect, useRef, useState } from "react";
import { mergeProgram, resolveProgram, savedProgramSchema, savedDaySchema, type SavedDay } from "@/lib/program";
import type { Day } from "@/lib/plan";
const key = "form-program-v1";

export function useProgram(loaded: boolean) {
  const [saved, setSaved] = useState<SavedDay[]>([]);
  const [status, setStatus] = useState("Connecting");
  const [ready, setReady] = useState(false);
  const current = useRef(saved);
  const flush = useRef<(() => void) | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = savedProgramSchema.safeParse(JSON.parse(raw));
        if (parsed.success) { current.current = parsed.data; setSaved(parsed.data); }
        else setStatus("Could not read saved program");
      }
    } catch { setStatus("Device storage unavailable"); }
    setReady(true);
  }, []);
  useEffect(() => {
    if (!loaded || !ready) return;
    let stopped = false, running = false, queued = false;
    async function request(path: string, init?: RequestInit) {
      const send = () => fetch(path, { ...init, cache: "no-store", signal: AbortSignal.timeout(15000) });
      let response = await send();
      if (response.status === 401) {
        const deviceKey = localStorage.getItem("form-device-key");
        if (deviceKey) {
          const pair = await fetch("/api/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: deviceKey }), signal: AbortSignal.timeout(15000) });
          if (pair.ok) response = await send();
        }
      }
      return response;
    }
    async function sync() {
      if (stopped) return;
      if (running) { queued = true; return; }
      running = true;
      setStatus("Saving");
      try {
        const response = await request("/api/program");
        if (!response.ok) throw Error(response.status === 401 ? "Device only" : "Saved on device · cloud retry pending");
        const remote = savedProgramSchema.parse(await response.json());
        const merged = mergeProgram(current.current, remote);
        // Persist the merged copy before acknowledging it in the UI.
        localStorage.setItem(key, JSON.stringify(merged));
        if (stopped) return;
        current.current = merged; setSaved(merged);
        for (const entry of merged) {
          if (remote.some(item => item.day.id === entry.day.id && item.updatedAt === entry.updatedAt)) continue;
          const result = await request("/api/program", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(entry) });
          if (!result.ok) { if (result.status === 409) queued = true; throw Error("Saved on device · cloud retry pending"); }
        }
        if (!stopped) setStatus("Synced");
      } catch (error) {
        if (!stopped) setStatus(error instanceof Error ? error.message : "Saved on device · cloud retry pending");
      } finally {
        running = false;
        if (queued && !stopped) { queued = false; void sync(); }
      }
    }
    const tick = () => { void sync(); };
    const visible = () => { if (document.visibilityState === "visible") tick(); };
    flush.current = tick; tick();
    const timer = setInterval(tick, 30000);
    window.addEventListener("online", tick);
    document.addEventListener("visibilitychange", visible);
    return () => { stopped = true; flush.current = null; clearInterval(timer); window.removeEventListener("online", tick); document.removeEventListener("visibilitychange", visible); };
  }, [loaded, ready]);
  function restore(entries: SavedDay[]) {
    const merged = mergeProgram(current.current, entries);
    localStorage.setItem(key, JSON.stringify(merged));
    current.current = merged; setSaved(merged); setStatus("Saved on device"); flush.current?.();
  }
  function save(day: Day) {
    const last = current.current.find(entry => entry.day.id === day.id)?.updatedAt;
    restore([savedDaySchema.parse({ day, updatedAt: new Date(Math.max(Date.now(), last ? Date.parse(last) + 1 : 0)).toISOString() })]);
  }
  return { plan: resolveProgram(saved), saved, save, restore, status };
}
