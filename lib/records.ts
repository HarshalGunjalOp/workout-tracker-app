import type { Session, SetLog } from "./training";

// A heavier load, or more reps at the same load. Holds compare duration.
export function isRecord(sessions: Session[], session: Session, mi: number, si: number, timed = false) {
  const movement = session.movements[mi];
  const candidate = movement.sets[si];
  const better = (a: SetLog, b: SetLog) => timed
    ? Number(a.reps) > Number(b.reps)
    : Number(a.weight) > Number(b.weight) ||
      (Number(a.weight) === Number(b.weight) && Number(a.reps) > Number(b.reps));
  const prior = sessions.filter(s => !s.discardedAt && s.id !== session.id && s.finishedAt)
    .flatMap(s => s.movements.filter(m => m.exerciseId === movement.exerciseId))
    .flatMap(m => m.sets.filter(s => s.done));
  // A first session establishes a baseline, rather than inventing a record.
  if (!prior.length || Number(candidate.reps) <= 0) return false;
  const earlier = movement.sets.slice(0, si).filter(s => s.done);
  return [...prior, ...earlier].every(s => better(candidate, s));
}
