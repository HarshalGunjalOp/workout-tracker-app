import type { Session, SetLog } from "./training";

// A heavier load, or more reps at the same load. Holds compare duration.
export function isRecord(sessions: Session[], session: Session, mi: number, si: number, timed = false) {
  const movement = session.movements[mi];
  const candidate = movement.sets[si];
  const better = (a: SetLog, b: SetLog) => timed
    ? Number(a.reps) > Number(b.reps)
    : Number(a.weight) > Number(b.weight) ||
      (Number(a.weight) === Number(b.weight) && Number(a.reps) > Number(b.reps));
  if (Number(candidate.reps) <= 0) return false;
  const previous = sessions
    .filter(s => s.finishedAt && !s.discardedAt && s.id !== session.id && s.startedAt <= session.startedAt)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap(s => s.movements.filter(m => m.exerciseId === movement.exerciseId))
    .map(m => m.sets[si])
    .find(set => set?.done);
  return previous !== undefined && better(candidate, previous);
}
