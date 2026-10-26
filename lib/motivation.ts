import type { Day, Exercise } from "./plan";
import type { Session, SetLog } from "./training";
import { localDate, movementsFor, weekStart } from "./training.ts";

const valid = (s: SetLog, timed = false) =>
  s.done && Number.isFinite(Number(s.reps)) && Number(s.reps) > 0 &&
  (timed || (s.weight.trim() !== "" && Number.isFinite(Number(s.weight)) && Number(s.weight) >= 0));

export function priorSessions(history: Session[], session: Session) {
  return history.filter((s) => s.id !== session.id && s.finishedAt && !s.discardedAt &&
    s.startedAt < session.startedAt && s.finishedAt <= session.startedAt);
}

// Calendar weeks are Monday–Sunday in India, anchored to the workout, not today.
export function previousWeekRange(startedAt: string) {
  const end = weekStart(new Date(startedAt));
  const start = new Date(`${end}T12:00:00+05:30`);
  start.setUTCDate(start.getUTCDate() - 7);
  return { start: localDate(start.toISOString()), end };
}

export function lastWeekSet(history: Session[], session: Session, exerciseId: string, si: number, timed = false): SetLog | undefined {
  const { start, end } = previousWeekRange(session.startedAt);
  const candidates = priorSessions(history, session)
    .filter((s) => localDate(s.startedAt) >= start && localDate(s.startedAt) < end)
    .flatMap((s) => s.movements.filter((m) => m.exerciseId === exerciseId).map((m) => m.sets[si]))
    .filter((s): s is SetLog => !!s && valid(s, timed));
  // Repeated workouts use the strongest completed matching set from last week.
  return candidates.sort((a, b) => timed
    ? Number(b.reps) - Number(a.reps)
    : Number(b.weight) - Number(a.weight) || Number(b.reps) - Number(a.reps))[0];
}

export type SetAchievement = {
  records: string[];
  weeklyWin: string | null;
  baseline?: SetLog;
  baselineEstablished: boolean;
};

export function setAchievement(history: Session[], session: Session, mi: number, si: number, ex: Exercise, allOtherSets = false): SetAchievement {
  const m = session.movements[mi], set = m?.sets[si];
  const baseline = m ? lastWeekSet(history, session, m.exerciseId, si, ex.timed) : undefined;
  const result: SetAchievement = { records: [], weeklyWin: null, baseline, baselineEstablished: false };
  if (!set || !valid(set, ex.timed)) return result;
  const past = priorSessions(history, session)
    .flatMap((s) => s.movements.filter((x) => x.exerciseId === m.exerciseId).flatMap((x) => x.sets))
    .filter((s) => valid(s, ex.timed));
  // Earlier sets in this workout also count. Tying a freshly earned PR isn't a new PR.
  const earlier = m.sets.filter((s, i) => (allOtherSets ? i !== si : i < si) && valid(s, ex.timed));
  const comparison = [...past, ...earlier];
  result.baselineEstablished = comparison.length === 0;
  const reps = Number(set.reps), weight = Number(set.weight);
  if (comparison.length) {
    if (ex.timed) {
      const best = Math.max(...comparison.map((s) => Number(s.reps)));
      if (reps > best) result.records.push(`Hold PR · +${reps - best}s`);
    } else {
      const bestWeight = Math.max(...comparison.map((s) => Number(s.weight)));
      if (weight > bestWeight) result.records.push(`Weight PR · +${+(weight - bestWeight).toFixed(2)} kg`);
      const sameLoad = comparison.filter((s) => Number(s.weight) === weight);
      const bestReps = Math.max(...sameLoad.map((s) => Number(s.reps)));
      if (sameLoad.length && reps > bestReps)
        result.records.push(`Rep PR · +${reps - bestReps} at ${weight === 0 ? "bodyweight" : `${weight} kg`}`);
    }
  }
  if (baseline) {
    const oldReps = Number(baseline.reps), oldWeight = Number(baseline.weight);
    if (ex.timed && reps > oldReps) result.weeklyWin = `+${reps - oldReps}s vs last week`;
    else if (!ex.timed && weight === oldWeight && reps > oldReps)
      result.weeklyWin = `+${reps - oldReps} rep${reps - oldReps === 1 ? "" : "s"} vs last week`;
    else if (!ex.timed && weight > oldWeight && reps >= oldReps)
      result.weeklyWin = `+${+(weight - oldWeight).toFixed(2)} kg vs last week · reps held or improved`;
    else if (!ex.timed && oldWeight > 0 && weight * reps > oldWeight * oldReps)
      result.weeklyWin = `+${Math.round(((weight * reps) / (oldWeight * oldReps) - 1) * 100)}% set volume vs last week`;
  }
  return result;
}

export function planProgress(session: Session, day: Day) {
  let done = 0, targets = 0, extras = 0, exercises = 0;
  const movements = day.exercises.flatMap((ex) => movementsFor(ex).map((m) => ({ ...m, ex })));
  for (const { id, ex } of movements) {
    const m = session.movements.find((m) => m.exerciseId === id);
    const planned = m?.sets.slice(0, ex.sets) ?? [];
    const logged = planned.filter((s) => valid(s, ex.timed));
    done += logged.length;
    targets += logged.filter((s) => Number(s.reps) >= ex.min).length;
    extras += m?.sets.slice(ex.sets).filter((s) => valid(s, ex.timed)).length ?? 0;
    if (logged.length === ex.sets) exercises++;
  }
  const total = movements.reduce((n, m) => n + m.ex.sets, 0);
  return { done, total, targets, extras, exercises, exerciseTotal: movements.length, complete: done === total };
}

export function sessionAchievements(history: Session[], session: Session, day: Day) {
  let prs = 0, weeklyWins = 0;
  const badges: Record<string, SetAchievement> = {};
  session.movements.forEach((m, mi) => {
    const ex = day.exercises.find((ex) => movementsFor(ex).some((x) => x.id === m.exerciseId));
    if (!ex) return;
    m.sets.forEach((set, si) => {
      if (!set.done) return;
      const achievement = setAchievement(history, session, mi, si, ex);
      badges[`${mi}:${si}`] = achievement;
      if (achievement.records.length) prs++;
      if (achievement.weeklyWin) weeklyWins++;
    });
  });
  return { prs, weeklyWins, badges };
}

export function describeSet(set: SetLog, timed = false) {
  return timed ? `${set.reps}s` : `${Number(set.weight) === 0 ? "BW" : `${set.weight} kg`} × ${set.reps}`;
}

export type SetReward = {
  key: string;
  sessionId: string;
  mi: number;
  si: number;
  achievement: SetAchievement;
  exercise: string;
  exerciseComplete: boolean;
  title: string;
  message: string;
  performance: string;
  allDone: boolean;
};

export function buildReward(history: Session[], session: Session, day: Day, mi: number, si: number, ex: Exercise): SetReward {
  const m = session.movements[mi], set = m.sets[si];
  const achievement = setAchievement(history, session, mi, si, ex, true);
  const progress = planProgress(session, day);
  const exerciseComplete = m.sets.slice(0, ex.sets).length === ex.sets && m.sets.slice(0, ex.sets).every((s) => s.done);
  const remaining = progress.total - progress.done;
  const encouragement = ["That’s another promise kept. Take your rest.", "Solid work. One set closer to the finish.", "You showed up for this set. Let that build.", "Another building block in the bank. Breathe, recover, repeat."];
  let title = encouragement[progress.done % encouragement.length].split(".")[0] + ".";
  let message = `${remaining} planned set${remaining === 1 ? "" : "s"} left. ${encouragement[progress.done % encouragement.length].split(". ").slice(1).join(". ")}`;
  if (Number(set.reps) < ex.min) { title = "Adjusted set, saved."; message = "Every honest rep counts. Take more rest or choose a manageable load for the next set."; }
  if (achievement.baselineEstablished) { title = "Your benchmark starts here."; message = "First completed set for this movement. You’re giving future you a number to build on."; }
  if (exerciseComplete) { title = "Exercise complete. You did the work."; message = `${m.name}: all ${ex.sets} planned sets logged. ${remaining ? "One movement down. Recover, then take the next one." : "Every planned set is in the bank."}`; }
  if (achievement.weeklyWin) title = "Last week, beaten.";
  if (achievement.records.length) title = "Personal record. That’s you getting stronger.";
  if (progress.complete && !achievement.records.length) title = "Every planned set. You showed up for all of it.";
  if (progress.done === Math.ceil(progress.total / 2) && !exerciseComplete && !achievement.records.length && !achievement.weeklyWin)
    title = "Halfway. Look how far you’ve come.";
  return { key: `${session.id}:${mi}:${si}`, sessionId: session.id, mi, si, achievement, exercise: m.name, exerciseComplete, title, message, performance: describeSet(set, ex.timed), allDone: progress.complete };
}
