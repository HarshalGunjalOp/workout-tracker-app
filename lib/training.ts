import type { Day, Exercise } from "./plan";
export type SetLog = { weight: string; reps: string; done: boolean };
export type MovementLog = {
  exerciseId: string;
  name: string;
  sets: SetLog[];
  note: string;
};
export type Session = {
  id: string;
  dayId: string;
  startedAt: string;
  finishedAt: string | null;
  updatedAt: string;
  movements: MovementLog[];
  note: string;
};
export const movementsFor = (ex: Exercise) =>
  ex.superset
    ? [
        { id: ex.id + "-a", name: ex.name.split(" + ")[0] },
        { id: ex.id + "-b", name: ex.name.split(" + ")[1] ?? "Extension" },
      ]
    : [{ id: ex.id, name: ex.name }];
export function makeSession(
  day: Day,
  history: Session[],
  id: string,
  now: string,
): Session {
  return {
    id,
    dayId: day.id,
    startedAt: now,
    finishedAt: null,
    updatedAt: now,
    note: "",
    movements: day.exercises.flatMap((ex) =>
      movementsFor(ex).map((m) => {
        const last = previousMovement(history, m.id);
        return {
          exerciseId: m.id,
          name: m.name,
          note: "",
          sets: Array.from({ length: ex.sets }, (_, i) => ({
            weight: last?.sets[i]?.weight ?? "",
            reps: ex.timed ? "30" : (last?.sets[i]?.reps ?? String(ex.min)),
            done: false,
          })),
        };
      }),
    ),
  };
}
export function previousMovement(
  history: Session[],
  id: string,
  exclude?: string,
): MovementLog | undefined {
  return [...history]
    .filter((s) => s.finishedAt && s.id !== exclude)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap((s) => s.movements)
    .find((m) => m.exerciseId === id);
}
export function canProgress(m: MovementLog, ex: Exercise): boolean {
  return (
    !ex.timed &&
    m.sets.length >= ex.sets &&
    m.sets.every((s) => s.done && Number(s.reps) >= ex.max) &&
    m.sets.every((s) => s.weight === m.sets[0].weight) &&
    Number(m.sets[0].weight) > 0
  );
}
export const completedSets = (s: Session) =>
  s.movements.reduce((a, m) => a + m.sets.filter((s) => s.done).length, 0);
export const volume = (s: Session) =>
  s.movements
    .filter((m) => m.exerciseId !== "vacuum")
    .reduce(
      (a, m) =>
        a +
        m.sets
          .filter((s) => s.done)
          .reduce((b, s) => b + Number(s.weight || 0) * Number(s.reps || 0), 0),
      0,
    );
export const duration = (s: Session) =>
  Math.max(
    0,
    Math.round(
      (new Date(s.finishedAt ?? Date.now()).getTime() -
        new Date(s.startedAt).getTime()) /
        60000,
    ),
  );
export function mergeSessions(local: Session[], remote: Session[]): Session[] {
  const map = new Map(local.map((s) => [s.id, s]));
  for (const s of remote) {
    if (!map.has(s.id) || map.get(s.id)!.updatedAt < s.updatedAt)
      map.set(s.id, s);
  }
  return [...map.values()].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
}
export function weekStart(now = new Date()): string {
  const local = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }),
  );
  local.setHours(0, 0, 0, 0);
  local.setDate(local.getDate() - ((local.getDay() + 6) % 7));
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, "0")}-${String(local.getDate()).padStart(2, "0")}`;
}
export function localDate(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
