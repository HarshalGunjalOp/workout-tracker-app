"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Trophy,
  ArrowUpRight,
  ArrowRight,
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Minus,
  X,
  Dumbbell,
  LayoutGrid,
  CalendarDays,
  ChartNoAxesCombined,
  Settings2,
  Timer,
  Cloud as CloudCheck,
  CloudOff,
  RotateCcw,
  Play,
  Flame,
  TrendingUp,
  Download,
  Link as LinkIcon,
  CheckCheck,
  Info,
  Pause,
  NotebookPen,
  ArrowUp,
  WifiOff,
  Target,
  Activity,
  Volume2,
  VolumeX,
  Moon,
} from "lucide-react";
import { PLAN, nextDay, totalSets, type Day, type Exercise } from "@/lib/plan";
import { sessionSchema } from "@/lib/schema";
import { SetLogger } from "./components/set-logger";
import { ProgressDashboard } from "./components/progress-dashboard";
import {
  nextWorkoutFocus,
  makeSession,
  movementsFor,
  supersetFocus,
  supersetPartner,
  editSet,
  previousMovement,
  completedSets,
  volume,
  duration,
  canProgress,
  mergeSessions,
  weekStart,
  localDate,
  type Session,
  type SetLog,
} from "@/lib/training";
import { isRecord } from "@/lib/records";
type Tab = "today" | "program" | "history" | "progress";
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(n);
const date = (
  s: string,
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" },
) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    ...opts,
  }).format(new Date(s));
const clock = (s: number) =>
  `${Math.floor(Math.max(0, s) / 60)}:${String(Math.max(0, s) % 60).padStart(2, "0")}`;
const storage = "form-training-v1";
function Emblem({ small = false }: { small?: boolean }) {
  return (
    <div className={"emblem " + (small ? "small" : "")} aria-hidden="true">
      <svg viewBox="0 0 300 320" fill="none">
        {Array.from({ length: 14 }, (_, i) => (
          <path
            key={i}
            d={`M ${30 + i * 5} ${45 + i * 4} L 150 ${280 - i * 7} L ${270 - i * 5} ${45 + i * 4}`}
            stroke="currentColor"
            strokeWidth="1.2"
          />
        ))}
        <path
          d="M44 65H256M65 96H235"
          stroke="currentColor"
          strokeWidth=".5"
          opacity=".4"
        />
      </svg>
      <span>BUILT, SET BY SET.</span>
    </div>
  );
}
function Empty({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Dumbbell;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <Icon size={25} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export default function Home() {
  const [tab, setTab] = useState<Tab>("today"),
    [selected, setSelected] = useState(PLAN[0]),
    [sessions, setSessions] = useState<Session[]>([]),
    [activeId, setActiveId] = useState<string | null>(null),
    [loaded, setLoaded] = useState(false),
    [sync, setSync] = useState("Connecting"),
    [settings, setSettings] = useState(false),
    [notice, setNotice] = useState(""),
    [detail, setDetail] = useState<Session | null>(null),
    [summary, setSummary] = useState<Session | null>(null),
    [finishPrompt, setFinishPrompt] = useState(false),
    [sound, setSound] = useState(true),
    [restEnd, setRestEnd] = useState<number | null>(null),
    [restLength, setRestLength] = useState(90),
    [now, setNow] = useState(Date.now()),
    [expanded, setExpanded] = useState<string | null>(null),
    [warmup, setWarmup] = useState(false),
    [saveError, setSaveError] = useState(false),
    [syncTick, setSyncTick] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  useEffect(() => {
    const update = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      setDarkMode(dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#151914" : "#f7f8f2");
    };
    update();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const followDevice = () => {
      try { if (localStorage.getItem("form-theme")) return; } catch {}
      document.documentElement.dataset.theme = media.matches ? "dark" : "light";
      update();
    };
    const syncTheme = (event: StorageEvent) => {
      if (event.key !== "form-theme" && event.key !== null) return;
      document.documentElement.dataset.theme = event.newValue === "dark" || event.newValue === "light"
        ? event.newValue : media.matches ? "dark" : "light";
      update();
    };
    media.addEventListener("change", followDevice);
    window.addEventListener("storage", syncTheme);
    return () => {
      media.removeEventListener("change", followDevice);
      window.removeEventListener("storage", syncTheme);
    };
  }, []);
  function toggleTheme() {
    const next = darkMode ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next === "dark" ? "#151914" : "#f7f8f2");
    setDarkMode(next === "dark");
    try { localStorage.setItem("form-theme", next); } catch {}
  }
  const [lastLogged, setLastLogged] = useState<{
    sessionId: string;
    mi: number;
    si: number;
  } | null>(null);
  const [celebration, setCelebration] = useState<{ id: number; pr: boolean; name: string } | null>(null);
  useEffect(() => {
    if (!celebration) return;
    const timer = setTimeout(() => setCelebration(null), 2600);
    return () => clearTimeout(timer);
  }, [celebration]);
  const [deferred, setDeferred] = useState<string[]>([]);
  const [setFeedback, setSetFeedback] = useState<{
    id: number; name: string; complete: boolean; count: number;
  } | null>(null);
  useEffect(() => {
    if (!setFeedback) return;
    const timer = setTimeout(() => setSetFeedback(null), 2200);
    return () => clearTimeout(timer);
  }, [setFeedback]);
  const progressRef = useRef<HTMLDivElement>(null);
  function revealNextExercise() {
    requestAnimationFrame(() => progressRef.current?.scrollIntoView({
      block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    }));
  }
  const lastLogTime = useRef(0);
  const synced = useRef<Record<string, string>>({}),
    current = useRef(sessions),
    fileRef = useRef<HTMLInputElement>(null),
    audioRef = useRef<AudioContext | null>(null),
    restWasRunning = useRef(false),
    syncBusy = useRef(false),
    hydratedRemote = useRef(false);
  current.current = sessions;
  const active = sessions.find((s) => s.id === activeId),
    history = sessions.filter((s) => s.finishedAt && !s.discardedAt),
    day = PLAN.find((d) => d.id === active?.dayId) ?? selected;
  const showNotice = useCallback((s: string) => setNotice(s), []);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storage);
      if (raw) {
        const data = JSON.parse(raw);
        if (Array.isArray(data.sessions)) {
          setSessions(mergeSessions(data.sessions, []));
          setActiveId(data.activeId ?? null);
          const focus = data.focus?.sessionId === data.activeId ? data.focus : null;
          setExpanded(typeof focus?.exerciseId === "string" ? focus.exerciseId : null);
          setDeferred(Array.isArray(focus?.deferred) ? focus.deferred.filter((id: unknown) => typeof id === "string") : []);
          setRestEnd(data.restEnd ?? null);
        }
        setSound(data.sound !== false);
      }
    } catch {
      setSaveError(true);
    }
    setSelected(nextDay());
    setLoaded(true);
    if ("serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "production")
        navigator.serviceWorker.register("/sw.js").catch(() => {});
      else
        navigator.serviceWorker
          .getRegistrations()
          .then((registrations) => {
            registrations.forEach((registration) => {
              if (registration.active?.scriptURL === `${location.origin}/sw.js`)
                registration.unregister();
            });
          })
          .catch(() => {});
    }
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(
        storage,
        JSON.stringify({ sessions, activeId, restEnd, sound, focus: { sessionId: activeId, exerciseId: expanded, deferred } }),
      );
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [sessions, activeId, loaded, restEnd, sound, expanded, deferred]);
  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;
    async function init() {
      try {
        const params = new URLSearchParams(location.hash.slice(1));
        const key = params.get("key");
        if (key) {
          const res = await fetch("/api/pair", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key }),
          });
          if (res.ok) {
            localStorage.setItem("form-device-key", key);
            window.history.replaceState(null, "", location.pathname);
            showNotice(
              "This device is connected. Your training comes with you.",
            );
          } else
            showNotice(
              "That device link could not connect. Local logging still works.",
            );
        }
        const res = await fetch("/api/sessions");
        if (!res.ok) {
          setSync(res.status === 401 ? "Device only" : "Offline");
          return;
        }
        const remote: Session[] = await res.json();
        remote.forEach((s) => (synced.current[s.id] = s.updatedAt));
        if (!cancelled) {
          setSessions((old) => mergeSessions(old, remote));
          hydratedRemote.current = true;
          setSync("Synced");
        }
      } catch {
        setSync("Offline");
      }
    }
    init();
    return () => {
      cancelled = true;
    };
  }, [loaded, showNotice]);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(async () => {
      if (syncBusy.current) return;
      syncBusy.current = true;
      try {
        if (!navigator.onLine) {
          setSync("Offline");
          return;
        }
        if (!hydratedRemote.current) {
          const res = await fetch("/api/sessions");
          if (!res.ok) {
            setSync(res.status === 401 ? "Device only" : "Offline");
            return;
          }
          const remote: Session[] = await res.json();
          remote.forEach((s) => (synced.current[s.id] = s.updatedAt));
          hydratedRemote.current = true;
          setSessions((old) => mergeSessions(old, remote));
          return;
        }
        const pending = current.current.filter(
          (s) => synced.current[s.id] !== s.updatedAt,
        );
        if (pending.length) setSync("Saving");
        for (const s of pending) {
          const res = await fetch("/api/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(s),
          });
          if (!res.ok) {
            if (res.status === 409) {
              hydratedRemote.current = false;
              showNotice("Another device has a newer copy. Syncing it now.");
              setSyncTick((v) => v + 1);
            }
            setSync(res.status === 401 ? "Device only" : "Offline");
            return;
          }
          synced.current[s.id] = s.updatedAt;
        }
        setSync("Synced");
      } catch {
        setSync("Offline");
      } finally {
        syncBusy.current = false;
      }
    }, 800);
    return () => clearTimeout(t);
  }, [sessions, loaded, syncTick, showNotice]);
  useEffect(() => {
    const tick = () => {
      hydratedRemote.current = false;
      setSyncTick((t) => t + 1);
    };
    const focus = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", focus);
    window.addEventListener("online", tick);
    const id = setInterval(tick, 30000);
    return () => {
      window.removeEventListener("online", tick);
      document.removeEventListener("visibilitychange", focus);
      clearInterval(id);
    };
  }, []);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(t);
  }, [notice]);
  useEffect(() => {
    if (!(settings || detail || summary || finishPrompt)) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),input:not([hidden]),textarea,[tabindex="0"]',
        ) ?? [],
      );
    focusable()[0]?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSettings(false);
        setDetail(null);
        setSummary(null);
        setFinishPrompt(false);
      }
      if (e.key === "Tab") {
        const nodes = focusable(),
          first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [settings, detail, summary, finishPrompt]);
  const seconds = restEnd ? Math.max(0, Math.ceil((restEnd - now) / 1000)) : 0;
  useEffect(() => {
    if (restEnd && seconds > 0) restWasRunning.current = true;
    if (restEnd && seconds === 0 && restWasRunning.current) {
      restWasRunning.current = false;
      if (sound && audioRef.current) {
        const ctx = audioRef.current;
        const osc = ctx.createOscillator(),
          g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.frequency.value = 660;
        g.gain.setValueAtTime(0.12, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      }
      navigator.vibrate?.([100, 60, 100]);
      showNotice("Rest complete. Ready for your next set.");
    }
  }, [restEnd, seconds, sound, showNotice]);
  useEffect(() => {
    if (!active) return;
    let lock: WakeLockSentinel | undefined;
    const request = () => {
      if ("wakeLock" in navigator)
        navigator.wakeLock
          .request("screen")
          .then((l) => (lock = l))
          .catch(() => {});
    };
    request();
    const visible = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      lock?.release();
      document.removeEventListener("visibilitychange", visible);
    };
  }, [activeId, !!active]);
  function update(fn: (s: Session) => Session) {
    if (!active) return;
    setSessions((old) =>
      old.map((s) =>
        s.id === active.id
          ? { ...fn(s), updatedAt: new Date().toISOString() }
          : s,
      ),
    );
  }
  function start(d: Day) {
    setNow(Date.now());
    if (activeId) {
      showNotice("Finish or resume your current workout first.");
      return;
    }
    const draft = sessions.find((s) => !s.finishedAt && !s.discardedAt);
    if (draft) {
      setActiveId(draft.id);
      setExpanded(
        draft.movements.find((m) => m.sets.some((s) => !s.done))?.exerciseId ??
          null,
      );
      return;
    }
    const s = makeSession(
      d,
      history,
      crypto.randomUUID(),
      new Date().toISOString(),
    );
    setDeferred([]);
    setSetFeedback(null);
    setSessions((old) => [s, ...old]);
    setActiveId(s.id);
    setExpanded(s.movements[0].exerciseId);
    setWarmup(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function initAudio() {
    if (sound && !audioRef.current) {
      try {
        audioRef.current = new AudioContext();
        audioRef.current.resume();
      } catch {}
    }
  }
  function setValue(
    mi: number,
    si: number,
    field: "weight" | "reps",
    value: string,
    carryForward = false,
  ) {
    if (!/^\d*(\.\d*)?$/.test(value) || value.length > 8) return;
    if (field === "reps" && (!/^\d*$/.test(value) || value.length > 5)) return;
    update((s) => editSet(s, mi, si, field, value, carryForward));
  }
  function toggleSet(mi: number, si: number, ex: Exercise) {
    const set = active!.movements[mi].sets[si];
    if (
      !set.done &&
      (!set.reps || Number(set.reps) <= 0 || (!ex.timed && set.weight === ""))
    ) {
      showNotice("Enter weight (0 for bodyweight) and reps to log this set.");
      return;
    }
    initAudio();
    update((s) => ({
      ...s,
      movements: s.movements.map((m, i) =>
        i === mi
          ? {
              ...m,
              sets: m.sets.map((a, j) =>
                j === si ? { ...a, done: !a.done } : a,
              ),
            }
          : m,
      ),
    }));
    if (!set.done) {
      setNow(Date.now());
      navigator.vibrate?.(30);
      setLastLogged({ sessionId: active!.id, mi, si });
      setRestLength(ex.rest);
      const hasRemaining = active!.movements.some((m, i) =>
        m.sets.some((s, j) => !s.done && !(i === mi && j === si)),
      );
      const partner = supersetPartner(active!, ex, mi);
      const roundContinues = partner?.sets[si] && !partner.sets[si].done;
      setRestEnd(
        hasRemaining && !roundContinues ? Date.now() + ex.rest * 1000 : null,
      );
      const pr = isRecord(sessions, active!, mi, si, !!ex.timed);
      const movementComplete = active!.movements[mi].sets.every((s, i) => s.done || i === si);
      if (pr || !hasRemaining) setCelebration({ id: Date.now(), pr, name: pr ? "NEW PR" : "WORKOUT COMPLETE" });
      setSetFeedback({ id: Date.now(), name: active!.movements[mi].name, complete: movementComplete, count: active!.movements[mi].sets.length });
    }
  }

  function finish() {
    if (!active || !completedSets(active)) {
      showNotice("Log at least one set to finish your workout.");
      return;
    }
    const finished = {
      ...active,
      finishedAt: active.finishedAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setSessions((old) => old.map((s) => (s.id === active.id ? finished : s)));
    setActiveId(null);
    setRestEnd(null);
    setFinishPrompt(false);
    setSummary(finished);
    setTab("today");
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { version: 1, exportedAt: new Date().toISOString(), sessions },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `form-training-${localDate(new Date().toISOString())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  async function copyLink() {
    const key = localStorage.getItem("form-device-key");
    if (!key) {
      showNotice(
        "Open your original personal device link first to enable device sharing.",
      );
      return;
    }
    try {
      await navigator.clipboard.writeText(
        `${location.origin}/#key=${encodeURIComponent(key)}`,
      );
      showNotice("Personal device link copied. Keep it private.");
    } catch {
      showNotice("Clipboard is unavailable in this browser.");
    }
  }
  const week = history.filter((s) => localDate(s.startedAt) >= weekStart()),
    weekDays = new Set(week.map((s) => s.dayId)),
    weekCount = weekDays.size,
    done = active ? completedSets(active) : 0,
    total = active
      ? active.movements.reduce((n, m) => n + m.sets.length, 0)
      : 0;
  const selectedMi =
    active?.movements.findIndex(
      (m) => m.exerciseId === expanded && m.sets.some((s) => !s.done),
    ) ?? -1;
  const candidateMi =
    selectedMi >= 0
      ? selectedMi
      : (active ? nextWorkoutFocus(active, day, deferred) : -1);
  const candidateEx = day.exercises.find(
    (e) =>
      e.id === active?.movements[candidateMi]?.exerciseId ||
      (e.superset &&
        movementsFor(e).some(
          (m) => m.id === active?.movements[candidateMi]?.exerciseId,
        )),
  );
  const focusMi = active ? supersetFocus(active, candidateEx, candidateMi) : -1;
  const focusMovement = active?.movements[focusMi];
  const focusEx = day.exercises.find(
    (e) =>
      focusMovement?.exerciseId === e.id ||
      focusMovement?.exerciseId.startsWith(e.id + "-"),
  );
  const focusSi = focusMovement?.sets.findIndex((s) => !s.done) ?? -1;
  const canUndo = !!(
    active &&
    lastLogged?.sessionId === active.id &&
    active.movements[lastLogged.mi]?.sets[lastLogged.si]?.done
  );
  const nav = [
    { id: "today" as Tab, label: "Today", icon: LayoutGrid },
    { id: "program" as Tab, label: "Your program", icon: Dumbbell },
    { id: "history" as Tab, label: "History", icon: CalendarDays },
    { id: "progress" as Tab, label: "Progress", icon: ChartNoAxesCombined },
  ];
  return (
    <div className="app-shell">
      {celebration && active && (
        <div key={celebration.id} className={"set-celebration " + (celebration.pr ? "record-celebration" : "")}>
          <div className="celebration-badge" role="status">
            {celebration.pr ? <Trophy size={32} /> : <CheckCheck size={28} />}
            <strong>{celebration.name}</strong>
          </div>
          {celebration.pr && <div className="confetti-field" aria-hidden="true">
            {Array.from({ length: 72 }, (_, i) => <i key={i} style={{
              "--x": `${Math.sin(i * 2.4) * 48}vw`,
              "--y": `${-25 - (i % 7) * 9}vh`,
              "--spin": `${(i % 2 ? 1 : -1) * (360 + i * 19)}deg`,
              "--delay": `${(i % 6) * 25}ms`,
              background: ["#d9ff65", "#ffd36b", "#ffffff", "#a8a1ff", "#ff91b6"][i % 5],
            } as React.CSSProperties} />)}
          </div>}
        </div>
      )}
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="FORM home">
          <span className="brand-mark">
            F<span />
          </span>
          FORM<span className="brand-period">.</span>
        </a>
        <div className="sidebar-label">YOUR TRAINING SPACE</div>
        <nav>
          {nav.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={tab === id ? "nav-item selected" : "nav-item"}
              onClick={() => {
                setTab(id);
                if (activeId) setActiveId(null);
              }}
            >
              <Icon size={19} />
              {label}
              {tab === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="personal-card">
            <span className="personal-symbol">↗</span>
            <h4>
              A little stronger.
              <br />
              Every single session.
            </h4>
            <p>
              Your plan. Your pace.
              <br />
              Your next level.
            </p>
            <div className="tiny-line" />
          </div>
          <button className="settings-nav" onClick={() => setSettings(true)}>
            <Settings2 size={18} /> Preferences
          </button>
          <div className="profile">
            <span className="avatar">HG</span>
            <div>
              <strong>Harshal Gunjal</strong>
              <small>Just you vs. you.</small>
            </div>
            <span className="profile-dot" />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            FORM<span>.</span>
          </div>
          <div className="breadcrumb">
            Your training <ChevronRight size={13} />
            <span>
              {active ? "In session" : nav.find((n) => n.id === tab)?.label}
            </span>
          </div>
          <div className="top-actions">
            <button
              className={
                "sync-status " + (sync === "Synced" ? "connected" : "")
              }
              onClick={() => {
                setSyncTick((t) => t + 1);
                showNotice(
                  sync === "Synced"
                    ? "All workouts are backed up to Neon."
                    : "Your workouts are saved on this device. Retrying cloud sync.",
                );
              }}
            >
              {sync === "Synced" ? (
                <CloudCheck size={16} />
              ) : (
                <CloudOff size={16} />
              )}
              <span>
                {sync === "Synced"
                  ? "All changes saved"
                  : sync === "Device only"
                    ? "Saved on device"
                    : sync}
              </span>
            </button>
            <button
              className="icon-button"
              onClick={() => setSettings(true)}
              aria-label="Preferences"
            >
              <Settings2 size={18} />
            </button>
            <span className="avatar small-avatar">H</span>
          </div>
        </header>
        {saveError && (
          <div className="storage-warning">
            <WifiOff size={17} /> Device storage is full or unavailable. Keep
            this page open and export a backup in Preferences.
          </div>
        )}
        {!loaded ? (
          <div className="loading">
            <span className="brand">FORM.</span>
            <p>Setting up your training space…</p>
          </div>
        ) : active ? (
          <main className="content workout-content">
            <div className="session-toolbar">
              <button className="icon-button" aria-label="Back to overview" onClick={() => setActiveId(null)}><ChevronLeft size={20} /></button>
              <div className="session-toolbar-title"><h1>{day.title}</h1><span>{clock(Math.floor(((active.finishedAt ? new Date(active.finishedAt).getTime() : now) - new Date(active.startedAt).getTime()) / 1000))} elapsed</span></div>
              <button className="text-button session-finish" onClick={() => setFinishPrompt(true)}>Finish <CheckCheck size={16} /></button>
            </div>
            <div ref={progressRef} className="session-progress" aria-label={`${done} of ${total} sets completed`}>
              <div className="session-progress-track" aria-hidden="true"><span style={{ width: `${done / Math.max(1, total) * 100}%` }} /></div>
              <span>{done} / {total} sets</span>
            </div>
            <details
              className={
                "workout-warmup " + (done > 0 ? "workout-warmup-started" : "")
              }
            >
              <summary>
                <Flame size={16} /> Warm-up{" "}
                <span>{warmup ? "Done" : "5 min · tap to view"}</span>
              </summary>
              <button
                className={"warmup " + (warmup ? "warmup-done" : "")}
                onClick={() => setWarmup((v) => !v)}
              >
                <span className="warmup-check">
                  {warmup ? <Check size={15} /> : <Flame size={17} />}
                </span>
                <span>
                  <strong>Get warm. Move well.</strong>
                  <small>{day.warmup}</small>
                </span>
                <span className="warmup-time">5 MIN</span>
              </button>
            </details>
            <div className="logger-anchor">
            <SetLogger
              session={active}
              feedback={setFeedback}
              mi={focusMi}
              ex={focusEx}
              previous={
                focusMovement
                  ? previousMovement(
                      history,
                      focusMovement.exerciseId,
                      active.id,
                    )
                  : undefined
              }
              seconds={seconds}
              resting={restEnd !== null}
              canUndo={canUndo}
              onChange={(field, value) =>
                setValue(focusMi, focusSi, field, value, true)
              }
              onLog={() => {
                if (!focusEx || Date.now() - lastLogTime.current < 600) return;
                lastLogTime.current = Date.now();
                toggleSet(focusMi, focusSi, focusEx);
                const logged = {
                  ...active,
                  movements: active.movements.map((m, i) =>
                    i !== focusMi
                      ? m
                      : {
                          ...m,
                          sets: m.sets.map((set, j) =>
                            j === focusSi ? { ...set, done: true } : set,
                          ),
                        },
                  ),
                };
                const nextMi = nextWorkoutFocus(logged, day, deferred, focusMovement?.exerciseId);
                setExpanded(logged.movements[nextMi]?.exerciseId ?? null);
                if (nextMi !== focusMi) revealNextExercise();

              }}
              onUndo={() => {
                if (!lastLogged || !canUndo) return;
                update((s) => ({
                  ...s,
                  movements: s.movements.map((m, i) =>
                    i === lastLogged.mi
                      ? {
                          ...m,
                          sets: m.sets.map((set, j) =>
                            j === lastLogged.si ? { ...set, done: false } : set,
                          ),
                        }
                      : m,
                  ),
                }));
                setExpanded(active.movements[lastLogged.mi].exerciseId);
                setRestEnd(null);
                setLastLogged(null);
                setSetFeedback(null);
                setCelebration(null);
                showNotice("Last set undone. Adjust it and log again.");
              }}
              onLater={() => {
                if (!focusEx) return;
                const nextDeferred = [...deferred.filter(id => id !== focusEx.id), focusEx.id];
                const nextMi = nextWorkoutFocus(active, day, nextDeferred);
                if (nextMi < 0 || nextMi === focusMi) return;
                revealNextExercise();
                setDeferred(nextDeferred);
                setExpanded(active.movements[nextMi].exerciseId);
                setSetFeedback(null);
              }}
              onRestMore={() =>
                setRestEnd((end) => Math.max(end ?? 0, Date.now()) + 15000)
              }
              onRestSkip={() => setRestEnd(null)}
              onReview={() => {
                if (done === total) finish();
                else {
                  setFinishPrompt(true);
                }
              }}
            />
            </div>
            <details className="workout-details">
              <summary>
                <LayoutGrid size={18} /> Workout overview & edits{" "}
                <span>
                  {done}/{total} sets
                </span>
              </summary>
              <div className="session-layout">
                <div className="exercise-stack">
                  {active.movements.map((m, mi) => {
                    const ex = day.exercises.find(
                      (e) =>
                        m.exerciseId === e.id ||
                        m.exerciseId.startsWith(e.id + "-"),
                    )!;
                    const previous = previousMovement(
                        history,
                        m.exerciseId,
                        active.id,
                      ),
                      complete = m.sets.every((s) => s.done),
                      open = expanded === m.exerciseId;
                    const ready = previous && canProgress(previous, ex);
                    return (
                      <section
                        className={
                          "exercise-card " +
                          (open ? "expanded" : "") +
                          (complete ? " exercise-done" : "")
                        }
                        key={m.exerciseId}
                      >
                        <button
                          className="exercise-header"
                          onClick={() =>
                            setExpanded(open ? null : m.exerciseId)
                          }
                        >
                          <span
                            className={
                              "exercise-number " + (complete ? "is-done" : "")
                            }
                          >
                            {complete ? (
                              <Check size={18} />
                            ) : (
                              String(mi + 1).padStart(2, "0")
                            )}
                          </span>
                          <span className="exercise-title">
                            <strong>
                              {m.name}
                              {ex.superset && (
                                <span className="superset-tag">SUPERSET</span>
                              )}
                            </strong>
                            <small>
                              {ex.muscle} <span>·</span>{" "}
                              {ex.min === ex.max
                                ? ex.min
                                : `${ex.min}–${ex.max}`}{" "}
                              {ex.timed ? "sec" : "reps"} <span>·</span>{" "}
                              {ex.rest}s {ex.superset ? "after both" : "rest"}
                            </small>
                          </span>
                          <span className="exercise-count">
                            {m.sets.filter((s) => s.done).length}/
                            {m.sets.length}
                          </span>
                          <ChevronRight
                            size={17}
                            className={open ? "rotated" : ""}
                          />
                        </button>
                        {open && (
                          <div className="exercise-body">
                            <div className="form-cue">
                              <Info size={15} />
                              <span>{ex.cue}</span>
                            </div>
                            {previous?.note && (
                              <div className="form-cue previous-note">
                                <NotebookPen size={15} />
                                <span>Last time: {previous.note}</span>
                              </div>
                            )}
                            {ready && (
                              <div className="progression-cue">
                                <TrendingUp size={16} />
                                <span>
                                  You earned a weight increase. Try the smallest
                                  available increment.
                                </span>
                              </div>
                            )}
                            <div className="set-table">
                              <div className="set-table-header">
                                <span>SET</span>
                                <span>LAST TIME</span>
                                <span>{ex.timed ? "LOAD" : "KG"}</span>
                                <span>{ex.timed ? "SECONDS" : "REPS"}</span>
                                <span>LOG</span>
                              </div>
                              {m.sets.map((s, si) => (
                                <div
                                  className={
                                    "set-row " + (s.done ? "logged" : "") + (s.done && isRecord(sessions, active, mi, si, !!ex.timed) ? " record-set" : "")
                                  }
                                  key={si}
                                >
                                  <span className="set-index">{s.done && isRecord(sessions, active, mi, si, !!ex.timed) ? <Trophy size={18} aria-label="Personal record" /> : si + 1}</span>
                                  <span className="previous-set">
                                    {previous?.sets[si]?.done
                                      ? `${previous.sets[si].weight || "BW"} × ${previous.sets[si].reps}`
                                      : "—"}
                                  </span>
                                  <input
                                    aria-label={`${m.name} set ${si + 1} weight`}
                                    inputMode="decimal"
                                    type="text"
                                    value={s.weight}
                                    maxLength={8}
                                    placeholder={ex.timed ? "—" : "0"}
                                    disabled={!!ex.timed}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) =>
                                      setValue(mi, si, "weight", e.target.value)
                                    }
                                  />
                                  <input
                                    aria-label={`${m.name} set ${si + 1} ${ex.timed ? "seconds" : "reps"}`}
                                    inputMode="numeric"
                                    type="text"
                                    value={s.reps}
                                    maxLength={5}
                                    onFocus={(e) => e.target.select()}
                                    onChange={(e) =>
                                      setValue(mi, si, "reps", e.target.value)
                                    }
                                  />
                                  <button
                                    className="log-button"
                                    aria-label={`${s.done ? "Undo" : "Complete"} ${m.name} set ${si + 1}`}
                                    aria-pressed={s.done}
                                    onClick={() => toggleSet(mi, si, ex)}
                                  >
                                    <Check size={20} />
                                  </button>
                                </div>
                              ))}
                            </div>
                            <div className="exercise-tools">
                              <button
                                onClick={() =>
                                  update((s) => ({
                                    ...s,
                                    movements: s.movements.map((x, i) =>
                                      i === mi
                                        ? {
                                            ...x,
                                            sets: [
                                              ...x.sets,
                                              {
                                                ...x.sets.at(-1)!,
                                                done: false,
                                              },
                                            ],
                                          }
                                        : x,
                                    ),
                                  }))
                                }
                                disabled={m.sets.length >= 20}
                              >
                                <Plus size={15} /> Add set
                              </button>
                              <button
                                onClick={() => {
                                  const first = m.sets[0];
                                  if (!first.weight && !ex.timed) {
                                    showNotice(
                                      "Enter your first set’s weight, then copy it to the rest.",
                                    );
                                    return;
                                  }
                                  update((s) => ({
                                    ...s,
                                    movements: s.movements.map((x, i) =>
                                      i === mi
                                        ? {
                                            ...x,
                                            sets: x.sets.map((a) =>
                                              a.done
                                                ? a
                                                : {
                                                    ...a,
                                                    weight: first.weight,
                                                    reps: first.reps,
                                                  },
                                            ),
                                          }
                                        : x,
                                    ),
                                  }));
                                  showNotice(
                                    "First set copied to unfinished sets.",
                                  );
                                }}
                              >
                                <CheckCheck size={15} /> Fill from first set
                              </button>
                              {m.sets.length > ex.sets && (
                                <button
                                  aria-label="Remove extra set"
                                  onClick={() =>
                                    update((s) => ({
                                      ...s,
                                      movements: s.movements.map((x, i) =>
                                        i === mi
                                          ? { ...x, sets: x.sets.slice(0, -1) }
                                          : x,
                                      ),
                                    }))
                                  }
                                >
                                  <Minus size={15} />
                                </button>
                              )}
                            </div>
                            <label className="note-field">
                              <NotebookPen size={16} />
                              <input
                                value={m.note}
                                maxLength={1000}
                                placeholder="A note for next time…"
                                onChange={(e) =>
                                  update((s) => ({
                                    ...s,
                                    movements: s.movements.map((x, i) =>
                                      i === mi
                                        ? { ...x, note: e.target.value }
                                        : x,
                                    ),
                                  }))
                                }
                              />
                            </label>
                            {complete && (
                              <button
                                className="next-exercise"
                                onClick={() => {
                                  const next = active.movements.find(
                                    (x, i) =>
                                      i > mi && !x.sets.every((s) => s.done),
                                  );
                                  if (next) {
                                    setExpanded(next.exerciseId);
                                    setTimeout(
                                      () =>
                                        document
                                          .querySelector(
                                            ".exercise-card.expanded",
                                          )
                                          ?.scrollIntoView({
                                            behavior: "smooth",
                                            block: "center",
                                          }),
                                      50,
                                    );
                                  } else setFinishPrompt(true);
                                }}
                              >
                                {" "}
                                {mi < active.movements.length - 1
                                  ? "Next exercise"
                                  : "Review workout"}
                                <ArrowRight size={16} />
                              </button>
                            )}
                          </div>
                        )}
                      </section>
                    );
                  })}
                  <label className="session-note">
                    <span>SESSION NOTES</span>
                    <textarea
                      value={active.note}
                      maxLength={2000}
                      placeholder="How did it feel? Anything to remember?"
                      onChange={(e) =>
                        update((s) => ({ ...s, note: e.target.value }))
                      }
                    />
                  </label>
                  <button
                    className="finish-wide dark-button"
                    onClick={() => setFinishPrompt(true)}
                  >
                    Finish workout <CheckCheck size={18} />
                  </button>
                </div>
                <aside className="session-side">
                  <div className="rest-card">
                    <div className="section-overline">
                      <Timer size={16} /> REST TIMER
                      <button
                        className="icon-button"
                        onClick={() => {
                          initAudio();
                          setSound((v) => !v);
                        }}
                        aria-label={sound ? "Mute timer" : "Unmute timer"}
                      >
                        {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      </button>
                    </div>
                    <div
                      className={
                        "timer-circle " +
                        (seconds === 0 && restEnd ? "timer-ready" : "")
                      }
                      style={
                        {
                          "--timer-progress": `${Math.min(100, (seconds / restLength) * 100)}%`,
                        } as React.CSSProperties
                      }
                    >
                      <strong>
                        {restEnd ? clock(seconds) : clock(restLength)}
                      </strong>
                      <span>
                        {restEnd
                          ? seconds
                            ? "BREATHE & RESET"
                            : "READY WHEN YOU ARE"
                          : "STARTS AFTER EACH SET"}
                      </span>
                    </div>
                    <div className="timer-controls">
                      <button
                        onClick={() =>
                          setRestEnd((end) => (end ?? Date.now()) + 15000)
                        }
                      >
                        +15s
                      </button>
                      <button
                        className="timer-main"
                        onClick={() => {
                          initAudio();
                          if (restEnd) setRestEnd(null);
                          else setRestEnd(Date.now() + restLength * 1000);
                        }}
                        aria-label={restEnd ? "Reset timer" : "Start timer"}
                      >
                        {restEnd ? <RotateCcw size={20} /> : <Play size={20} />}
                      </button>
                      <button
                        onClick={() => {
                          setRestEnd(null);
                          showNotice("Rest skipped. Listen to your body.");
                        }}
                      >
                        Skip <ChevronRight size={13} />
                      </button>
                    </div>
                    <p>Rest is part of the work.</p>
                  </div>
                  <div className="training-rule">
                    <Target size={19} />
                    <h4>Clean reps. Real progress.</h4>
                    <p>
                      Leave 1–2 reps in reserve. Reach {day.exercises[0].max}{" "}
                      reps across every set before adding weight.
                    </p>
                    <span>CONTROL THE LOWERING · NO MOMENTUM</span>
                  </div>
                </aside>
              </div>
            </details>
          </main>
        ) : (
          <main className="content">
            {tab === "today" && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">
                      {date(new Date(now).toISOString(), {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      }).toUpperCase()}
                    </div>
                    <h1>
                      Made for your next level
                      <span className="lime-period">.</span>
                    </h1>
                    <p>
                      Welcome back, Harshal. Let’s make your next set count.
                    </p>
                  </div>
                  <div className="plan-badge">
                    <span /> THE V-TAPER PROJECT
                  </div>
                </div>
                {sessions.find((s) => !s.finishedAt && !s.discardedAt) && (
                  <button
                    className="resume-banner"
                    onClick={() => {
                      const s = sessions.find(
                        (s) => !s.finishedAt && !s.discardedAt,
                      )!;
                      setActiveId(s.id);
                      setExpanded(
                        s.movements.find((m) => !m.sets.every((s) => s.done))
                          ?.exerciseId ?? s.movements[0].exerciseId,
                      );
                    }}
                  >
                    <span className="live-dot" />
                    <strong>Your workout is right where you left it.</strong>
                    <span>
                      Resume session <ArrowRight size={16} />
                    </span>
                  </button>
                )}
                <div className="dashboard-grid">
                  <section className="hero">
                    <div className="hero-content">
                      <div className="hero-topline">
                        <span className="live-dot" /> NEXT UP{" "}
                        <span className="hero-day">
                          {selected.day.toUpperCase()}
                        </span>
                      </div>
                      <h2>
                        {selected.id === "upper" ? (
                          <>
                            Build your
                            <br />
                            upper frame.
                          </>
                        ) : selected.id === "lower-a" ? (
                          <>
                            Strength in
                            <br />
                            the details.
                          </>
                        ) : selected.id === "push" ? (
                          <>
                            Press toward
                            <br />
                            your next level.
                          </>
                        ) : selected.id === "pull" ? (
                          <>
                            Build a<br />
                            wider back.
                          </>
                        ) : (
                          <>
                            Find your
                            <br />
                            strong foundation.
                          </>
                        )}
                      </h2>
                      <p>
                        {selected.title} <span>/</span> {selected.label}
                      </p>
                      <div className="hero-meta">
                        <span>
                          <Dumbbell size={15} />
                          {selected.exercises.length} exercises
                        </span>
                        <span>
                          <Timer size={15} />
                          {selected.minutes} min
                        </span>
                        <span>{totalSets(selected)} sets</span>
                      </div>
                      <button
                        className="lime-button"
                        onClick={() => start(selected)}
                      >
                        {sessions.some((s) => !s.finishedAt && !s.discardedAt)
                          ? "Resume workout"
                          : "Start workout"}
                        <ArrowUpRight size={21} />
                      </button>
                    </div>
                    <Emblem />
                  </section>
                  <section className="week-card">
                    <div className="card-top">
                      <span className="section-overline">
                        THE COMPOUND EFFECT
                      </span>
                      <Activity size={18} />
                    </div>
                    <h3>Show up. Stack wins.</h3>
                    <div
                      className="consistency-ring"
                      style={
                        {
                          "--progress": `${(weekCount / 5) * 100}%`,
                        } as React.CSSProperties
                      }
                    >
                      <div>
                        <strong>
                          {weekCount}
                          <span>/5</span>
                        </strong>
                        <small>SESSIONS THIS WEEK</small>
                      </div>
                    </div>
                    <div className="week-mini">
                      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                        <span
                          key={i}
                          className={
                            week.some(
                              (s) =>
                                Number(
                                  new Intl.DateTimeFormat("en-US", {
                                    timeZone: "Asia/Kolkata",
                                    weekday: "short",
                                  })
                                    .format(new Date(s.startedAt))
                                    .replace(/Mon/, "0")
                                    .replace(/Tue/, "1")
                                    .replace(/Wed/, "2")
                                    .replace(/Thu/, "3")
                                    .replace(/Fri/, "4")
                                    .replace(/Sat/, "5")
                                    .replace(/Sun/, "6"),
                                ) === i,
                            )
                              ? "complete-day"
                              : [2, 6].includes(i)
                                ? "rest-day"
                                : ""
                          }
                        >
                          {week.some(
                            (s) =>
                              new Date(s.startedAt).toLocaleDateString(
                                "en-US",
                                { timeZone: "Asia/Kolkata", weekday: "short" },
                              ) ===
                              ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                                i
                              ],
                          ) ? (
                            <Check size={13} />
                          ) : (
                            d
                          )}
                        </span>
                      ))}
                    </div>
                    <p>
                      {weekCount === 0
                        ? "A fresh week. Five opportunities to grow."
                        : weekCount === 5
                          ? "Five sessions. A whole week of work, earned."
                          : `${5 - weekCount} more sessions to complete your week.`}
                    </p>
                  </section>
                </div>
                <section className="weekly-section">
                  <div className="section-heading">
                    <div>
                      <h2>
                        Your week, in motion<span>.</span>
                      </h2>
                      <p>A focused split. Every muscle has its moment.</p>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => setTab("program")}
                    >
                      Explore program <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <div className="week-strip">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                      const wd = i + 1 === 7 ? 0 : i + 1;
                      const d = PLAN.find((d) => d.weekday === wd);
                      return d ? (
                        <button
                          key={i}
                          className={
                            "day-tile " +
                            (selected.id === d.id ? "active-day" : "") +
                            (weekDays.has(d.id) ? " day-finished" : "")
                          }
                          onClick={() => setSelected(d)}
                        >
                          <div>
                            <span>{d.short}</span>
                            {weekDays.has(d.id) ? (
                              <Check size={15} />
                            ) : selected.id === d.id ? (
                              <span className="day-dot" />
                            ) : (
                              <span className="day-index">
                                0{PLAN.indexOf(d) + 1}
                              </span>
                            )}
                          </div>
                          <strong>{d.title}</strong>
                          <small>
                            {d.minutes} min <span>·</span> {d.exercises.length}{" "}
                            exercises
                          </small>
                          <div className="tile-bottom">
                            {selected.id === d.id
                              ? "SELECTED"
                              : weekDays.has(d.id)
                                ? "COMPLETED"
                                : d.label.toUpperCase()}
                            {selected.id === d.id && <ArrowUpRight size={14} />}
                          </div>
                        </button>
                      ) : (
                        <div className="day-tile recovery" key={i}>
                          <div>
                            <span>{i === 2 ? "WED" : "SUN"}</span>
                            <span className="rest-symbol">∿</span>
                          </div>
                          <strong>
                            {i === 2 ? "Active recovery" : "Full rest"}
                          </strong>
                          <small>
                            {i === 2 ? "Move. Mobilize." : "Recover. Rebuild."}
                          </small>
                          <div className="tile-bottom">
                            {i === 2 ? "8,000 STEPS" : "LET IT COMPOUND"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
                <div className="lower-grid">
                  <section className="preview-section">
                    <div className="section-heading">
                      <div>
                        <div className="eyebrow">A LOOK INSIDE</div>
                        <h2>
                          {selected.title}
                          <span>.</span>
                        </h2>
                      </div>
                      <span className="subtle-pill">
                        {totalSets(selected)} working sets
                      </span>
                    </div>
                    <div className="exercise-preview">
                      {selected.exercises.slice(0, 4).map((ex, i) => (
                        <div key={ex.id}>
                          <span className="preview-index">0{i + 1}</span>
                          <span className="preview-icon">
                            <Dumbbell size={19} />
                          </span>
                          <span className="preview-name">
                            <strong>{ex.name}</strong>
                            <small>
                              {ex.superset
                                ? "SUPERSET · Alternate both movements each round · "
                                : ""}
                              {ex.muscle}
                            </small>
                          </span>
                          <span className="preview-prescription">
                            {ex.sets} <span>×</span> {ex.min}–{ex.max}
                            <small> {ex.timed ? "sec" : "reps"}</small>
                          </span>
                        </div>
                      ))}
                    </div>
                    <button
                      className="preview-more"
                      onClick={() => {
                        setTab("program");
                        setExpanded(selected.id);
                      }}
                    >
                      View all {selected.exercises.length} exercises{" "}
                      <ArrowRight size={16} />
                    </button>
                  </section>
                  <section className="next-level">
                    <div className="section-overline">
                      <TrendingUp size={16} /> THE NEXT SMALL WIN
                    </div>
                    <h3>
                      One more rep.
                      <br />A stronger you.
                    </h3>
                    <p>
                      {history.length
                        ? "Your last workout is your new starting line. Match the weight, own the reps, then build from there."
                        : "Your first session sets the baseline. From there, you’ll always know exactly what to beat."}
                    </p>
                    <div className="progress-example">
                      <span>YOUR METHOD</span>
                      <strong>
                        Own the reps <ArrowRight size={15} /> Add the weight
                      </strong>
                      <div className="method-bars">
                        {[35, 46, 54, 65, 75, 87, 100].map((h, i) => (
                          <i key={i} style={{ height: h + "%" }} />
                        ))}
                      </div>
                      <small>Small improvements. Serious momentum.</small>
                    </div>
                  </section>
                </div>
              </>
            )}
            {tab === "program" && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">YOUR PERSONAL BLUEPRINT</div>
                    <h1>
                      The V-taper project<span className="lime-period">.</span>
                    </h1>
                    <p>Five days. A clear purpose for every set.</p>
                  </div>
                  <span className="plan-badge">5-DAY SPLIT · 65–75 MIN</span>
                </div>
                <div className="program-intro">
                  <Target size={23} />
                  <div>
                    <strong>Progress with precision.</strong>
                    <p>
                      Use a weight that leaves 1–2 reps in reserve. Hit the top
                      of the rep range across all sets, then increase by the
                      smallest available increment.
                    </p>
                  </div>
                  <span>
                    3–1–1–1
                    <br />
                    <small>TEMPO GUIDE</small>
                  </span>
                </div>
                <div className="program-list">
                  {PLAN.map((d, i) => (
                    <section className="program-card" key={d.id}>
                      <button
                        className="program-header"
                        onClick={() =>
                          setExpanded(expanded === d.id ? null : d.id)
                        }
                      >
                        <span className="program-day">
                          {d.short}
                          <small>DAY 0{i + 1}</small>
                        </span>
                        <span>
                          <strong>{d.title}</strong>
                          <small>{d.focus}</small>
                        </span>
                        <span className="program-meta">
                          {totalSets(d)} sets · {d.minutes} min
                        </span>
                        <ChevronRight
                          className={expanded === d.id ? "rotated" : ""}
                          size={19}
                        />
                      </button>
                      {expanded === d.id && (
                        <div className="program-body">
                          <p className="program-warmup">
                            <Flame size={17} />
                            {d.warmup}
                          </p>
                          {d.exercises.map((ex, j) => (
                            <div className="program-exercise" key={ex.id}>
                              <span>0{j + 1}</span>
                              <div>
                                <strong>
                                  {ex.name}
                                  {ex.superset && <em>SUPERSET</em>}
                                </strong>
                                <small>
                                  {ex.superset
                                    ? "SUPERSET · Alternate both movements each round · "
                                    : ""}
                                  {ex.muscle}
                                </small>
                                <p>{ex.cue}</p>
                              </div>
                              <span>
                                {ex.sets} ×{" "}
                                {ex.min === ex.max
                                  ? ex.min
                                  : `${ex.min}–${ex.max}`}
                                <small>
                                  {ex.timed ? "seconds" : "reps"} · {ex.rest}s
                                  {ex.superset ? " after both" : " rest"}
                                </small>
                              </span>
                            </div>
                          ))}
                          <button
                            className="dark-button"
                            onClick={() => start(d)}
                          >
                            Start {d.title.toLowerCase()}{" "}
                            <ArrowUpRight size={18} />
                          </button>
                        </div>
                      )}
                    </section>
                  ))}
                </div>
                <p className="footnote">
                  Wednesday: active recovery, mobility & steps. Sunday: full
                  rest. Paired movements are logged separately so each has an
                  accurate history.
                </p>
              </>
            )}
            {tab === "history" && (
              <>
                <div className="page-heading">
                  <div>
                    <div className="eyebrow">THE WORK YOU PUT IN</div>
                    <h1>
                      Your training journal
                      <span className="lime-period">.</span>
                    </h1>
                    <p>Every set has a story. This is yours.</p>
                  </div>
                  <button className="outline-button" onClick={exportData}>
                    <Download size={16} /> Export
                  </button>
                </div>
                {!history.length ? (
                  <Empty
                    icon={CalendarDays}
                    title="Your first chapter is unwritten."
                  >
                    Finish a workout and it will land here, with every set, rep,
                    and note ready for next time.
                  </Empty>
                ) : (
                  <div className="history-list">
                    {[...history]
                      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
                      .map((s) => (
                        <button
                          className="history-card"
                          key={s.id}
                          onClick={() => setDetail(s)}
                        >
                          <span className="history-date">
                            {date(s.startedAt, { day: "numeric" })}
                            <small>
                              {date(s.startedAt, { month: "short" })}
                            </small>
                          </span>
                          <span className="history-title">
                            <strong>
                              {PLAN.find((d) => d.id === s.dayId)?.title}
                            </strong>
                            <small>
                              {completedSets(s)} sets <span>·</span>{" "}
                              {duration(s)} min <span>·</span> {fmt(volume(s))}{" "}
                              kg
                            </small>
                          </span>
                          <span className="history-check">
                            <Check size={16} />
                          </span>
                          <ChevronRight size={19} />
                        </button>
                      ))}
                  </div>
                )}
              </>
            )}
            {tab === "progress" && <ProgressDashboard history={history} />}
            <footer className="page-footer">
              <span>
                FORM<span className="lime-period">.</span>{" "}
                <span>BUILT AROUND YOU.</span>
              </span>
              <span>Every set, a little stronger.</span>
            </footer>
          </main>
        )}
      </div>
      <nav className="mobile-nav">
        {nav.map(({ id, label, icon: Icon }) => (
          <button
            className={tab === id && !active ? "selected" : ""}
            key={id}
            onClick={() => {
              setTab(id);
              setActiveId(null);
            }}
          >
            <Icon size={21} />
            <span>{id === "program" ? "Program" : label}</span>
          </button>
        ))}
      </nav>
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {settings && (
        <div className="modal-backdrop" onClick={() => setSettings(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Preferences"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close preferences"
              onClick={() => setSettings(false)}
            >
              <X size={21} />
            </button>
            <div className="eyebrow">MAKE YOURSELF AT HOME</div>
            <h2>
              Your training space<span>.</span>
            </h2>
            <p>Simple by design. Personal by default.</p>
            <div className="preference-row">
              <Moon size={20} />
              <div>
                <strong>Dark mode</strong>
                <small>A softer glow. Remembered on this device.</small>
              </div>
              <button
                className={"switch " + (darkMode ? "on" : "")}
                role="switch"
                aria-checked={darkMode}
                aria-label="Dark mode"
                onClick={toggleTheme}
              >
                <i />
              </button>
            </div>
            <div className="preference-row">
              <Volume2 size={20} />
              <div>
                <strong>Rest timer sound</strong>
                <small>A gentle cue when it’s time for your next set.</small>
              </div>
              <button
                className={"switch " + (sound ? "on" : "")}
                role="switch"
                aria-checked={sound}
                aria-label="Rest timer sound"
                onClick={() => {
                  initAudio();
                  setSound(!sound);
                }}
              >
                <i />
              </button>
            </div>
            <button className="preference-row" onClick={copyLink}>
              <LinkIcon size={20} />
              <div>
                <strong>Connect another device</strong>
                <small>Copy your private link to your phone or computer.</small>
              </div>
              <ArrowUpRight size={19} />
            </button>
            <button className="preference-row" onClick={exportData}>
              <Download size={20} />
              <div>
                <strong>Export your training</strong>
                <small>Your complete journal as a portable JSON backup.</small>
              </div>
              <ArrowUpRight size={19} />
            </button>
            <button
              className="preference-row"
              onClick={() => fileRef.current?.click()}
            >
              <RotateCcw size={20} />
              <div>
                <strong>Restore a backup</strong>
                <small>Merge a FORM export with your existing journal.</small>
              </div>
              <ArrowUpRight size={19} />
            </button>
            <input
              ref={fileRef}
              hidden
              type="file"
              accept="application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  if (file.size > 5000000) throw Error();
                  const data = JSON.parse(await file.text());
                  if (
                    data.version !== 1 ||
                    !Array.isArray(data.sessions) ||
                    !data.sessions.every(
                      (s: unknown) => sessionSchema.safeParse(s).success,
                    )
                  )
                    throw Error();
                  setSessions((old) => mergeSessions(old, data.sessions));
                  showNotice("Backup restored. Your training is all here.");
                } catch {
                  showNotice("That file is not a valid FORM backup.");
                }
                e.target.value = "";
              }}
            />
            <div className="settings-detail">
              <span>UNITS</span>
              <strong>Kilograms (kg)</strong>
              <p>
                For dumbbells, log the weight of one dumbbell. For unilateral
                exercises, log reps per side. Use 0 kg for bodyweight. Timed
                holds are recorded in seconds.
              </p>
            </div>
            <div className="settings-detail">
              <span>ON YOUR PHONE</span>
              <p>
                In your browser’s menu, choose “Add to Home Screen” for an
                app-like experience. Keep your private device link somewhere
                safe.
              </p>
            </div>
            <div className="settings-status">
              <CloudCheck size={17} />{" "}
              {sync === "Synced"
                ? "Connected to your personal Neon database."
                : "Device copy active. Cloud: " + sync + "."}
            </div>
          </section>
        </div>
      )}
      {finishPrompt && active && (
        <div className="modal-backdrop" onClick={() => setFinishPrompt(false)}>
          <section
            className="modal finish-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Finish workout"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close"
              onClick={() => setFinishPrompt(false)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">WORKOUT REVIEW</div>
            <h2>
              That’s your work<span>.</span>
            </h2>
            <p>
              {done === total
                ? "Every set, checked off. Ready to save it?"
                : `${total - done} sets left across ${active.movements.filter((m) => m.sets.some((s) => !s.done)).length} exercises. Next: ${focusMovement?.name ?? "your remaining sets"}.`}
            </p>
            <div className="summary-stats">
              <div>
                <strong>{done}</strong>
                <span>SETS</span>
              </div>
              <div>
                <strong>{duration(active)}</strong>
                <span>MINUTES</span>
              </div>
              <div>
                <strong>{fmt(volume(active))}</strong>
                <span>KG LIFTED</span>
              </div>
            </div>
            {done < total && (
              <button
                className="lime-button"
                onClick={() => {
                  setFinishPrompt(false);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                Continue with next set <ArrowRight size={19} />
              </button>
            )}
            <button
              className={
                done === total ? "lime-button" : "outline-button finish-partial"
              }
              disabled={!done}
              onClick={finish}
            >
              {done === total
                ? "Save workout"
                : `Finish & save ${done} logged ${done === 1 ? "set" : "sets"}`}{" "}
              <Check size={19} />
            </button>
            <button
              className="text-button modal-secondary"
              onClick={() => setFinishPrompt(false)}
            >
              Back to workout <ArrowRight size={16} />
            </button>
            {!active.finishedAt && (
              <div className="discard-area">
                <button
                  className="discard-button"
                  onClick={() => {
                    const timestamp = new Date().toISOString();
                    setSessions((old) =>
                      old.map((s) =>
                        s.id === active.id
                          ? {
                              ...s,
                              discardedAt: timestamp,
                              updatedAt: timestamp,
                            }
                          : s,
                      ),
                    );
                    setActiveId(null);
                    setRestEnd(null);
                    setFinishPrompt(false);
                    showNotice(
                      "Session discarded. Start fresh whenever you’re ready.",
                    );
                  }}
                >
                  Discard this session
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      {summary && (
        <div className="modal-backdrop" onClick={() => setSummary(null)}>
          <section
            className="modal finish-modal celebration"
            role="dialog"
            aria-modal="true"
            aria-label="Workout saved"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close"
              onClick={() => setSummary(null)}
            >
              <X size={20} />
            </button>
            <div className="summary-symbol">
              <CheckCheck size={34} />
            </div>
            <div className="eyebrow">ANOTHER SESSION IN THE BANK</div>
            <h2>
              Stronger than
              <br />
              when you walked in<span>.</span>
            </h2>
            <p>
              {PLAN.find((d) => d.id === summary.dayId)?.title} ·{" "}
              {date(summary.startedAt)}
            </p>
            <div className="summary-stats">
              <div>
                <strong>{completedSets(summary)}</strong>
                <span>SETS</span>
              </div>
              <div>
                <strong>{duration(summary)}</strong>
                <span>MINUTES</span>
              </div>
              <div>
                <strong>{fmt(volume(summary))}</strong>
                <span>KG LIFTED</span>
              </div>
            </div>
            <p className="saved-message">
              <CloudCheck size={16} />
              Saved on this device
              {sync === "Synced"
                ? " and backed up."
                : ". Cloud sync will retry automatically."}
            </p>
            <button
              className="dark-button"
              onClick={() => {
                setSummary(null);
                setTab("history");
              }}
            >
              View your journal <ArrowUpRight size={18} />
            </button>
          </section>
        </div>
      )}
      {detail && (
        <div className="modal-backdrop" onClick={() => setDetail(null)}>
          <section
            className="modal detail-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Workout details"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label="Close workout details"
              onClick={() => setDetail(null)}
            >
              <X size={20} />
            </button>
            <div className="eyebrow">
              {date(detail.startedAt, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              }).toUpperCase()}
            </div>
            <h2>
              {PLAN.find((d) => d.id === detail.dayId)?.title}
              <span>.</span>
            </h2>
            <p>
              {duration(detail)} min · {completedSets(detail)} sets ·{" "}
              {fmt(volume(detail))} kg
            </p>
            {detail.movements.map((m) => (
              <div className="detail-movement" key={m.exerciseId}>
                <strong>{m.name}</strong>
                <div>
                  {m.sets
                    .filter((s) => s.done)
                    .map((s, i) => (
                      <span key={i}>
                        {m.exerciseId === "vacuum"
                          ? `${s.reps}s`
                          : `${s.weight || "0"} kg × ${s.reps}`}
                      </span>
                    ))}
                </div>
                {m.note && <p>{m.note}</p>}
              </div>
            ))}
            {detail.note && <p className="detail-note">{detail.note}</p>}
            <button
              className="outline-button"
              onClick={() => {
                if (sessions.some((s) => !s.finishedAt && !s.discardedAt)) {
                  showNotice(
                    "Finish your current workout before editing this one.",
                  );
                  return;
                }
                setActiveId(detail.id);
                setExpanded(detail.movements[0].exerciseId);
                setDetail(null);
              }}
            >
              Edit this workout <NotebookPen size={16} />
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
