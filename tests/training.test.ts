import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN, nextDay, totalSets } from "../lib/plan.ts";
import {
  makeSession,
  supersetFocus,
  supersetPartner,
  canProgress,
  mergeSessions,
  volume,
  completedSets,
  previousMovement,
  localDate,
  editSet,
} from "../lib/training.ts";
const now = "2026-10-26T10:00:00.000Z";
test("all five program days preserve seven exercises and paired movements", () => {
  assert.equal(PLAN.length, 5);
  assert.ok(PLAN.every((d) => d.exercises.length === 7));
  assert.equal(totalSets(PLAN[0]), 24);
  const lower = makeSession(PLAN[1], [], "id", now);
  assert.equal(lower.movements.length, 8);
  assert.deepEqual(
    lower.movements
      .filter((m) => m.exerciseId.startsWith("neck-flex"))
      .map((m) => m.name),
    ["Lying plate neck flexion"],
  );
  const saturday = makeSession(PLAN[4], [], "sat", now);
  assert.deepEqual(
    saturday.movements
      .filter((m) => m.exerciseId.startsWith("side-neck"))
      .map((m) => m.name),
    ["Lying side neck raise"],
  );
  assert.equal(
    lower.movements.filter((m) => m.exerciseId.startsWith("wrist-reverse"))
      .length,
    2,
  );
  assert.equal(
    totalSets(PLAN[1]),
    lower.movements.reduce((n, m) => n + m.sets.length, 0),
  );
});
test("the app prescription matches the updated V-taper blueprint", () => {
  const prescriptions = PLAN.flatMap((day) =>
    day.exercises.map((exercise) => ({
      day: day.id,
      id: exercise.id,
      sets: exercise.sets,
      reps: `${exercise.min}-${exercise.max}`,
      rest: exercise.rest,
    })),
  );

  assert.deepEqual(prescriptions, [
    { day: "upper", id: "wide-lat", sets: 4, reps: "10-12", rest: 90 },
    { day: "upper", id: "incline-db", sets: 4, reps: "10-12", rest: 90 },
    { day: "upper", id: "supported-row", sets: 3, reps: "10-12", rest: 90 },
    { day: "upper", id: "behind-lateral", sets: 4, reps: "12-15", rest: 60 },
    { day: "upper", id: "low-fly", sets: 3, reps: "12-15", rest: 60 },
    { day: "upper", id: "incline-curl", sets: 3, reps: "12-15", rest: 60 },
    { day: "upper", id: "overhead-rope", sets: 3, reps: "12-15", rest: 60 },
    { day: "lower-a", id: "smith-squat", sets: 3, reps: "10-12", rest: 90 },
    { day: "lower-a", id: "leg-curl", sets: 3, reps: "12-15", rest: 75 },
    { day: "lower-a", id: "leg-extension", sets: 3, reps: "12-15", rest: 60 },
    { day: "lower-a", id: "standing-calf", sets: 4, reps: "15-20", rest: 60 },
    { day: "lower-a", id: "rope-crunch", sets: 3, reps: "12-15", rest: 60 },
    { day: "lower-a", id: "wrist-reverse", sets: 3, reps: "15-20", rest: 60 },
    { day: "lower-a", id: "neck-flex", sets: 3, reps: "15-20", rest: 60 },
    { day: "push", id: "smith-incline", sets: 4, reps: "8-12", rest: 90 },
    { day: "push", id: "flat-db", sets: 3, reps: "10-12", rest: 90 },
    { day: "push", id: "high-crossover", sets: 3, reps: "12-15", rest: 60 },
    { day: "push", id: "shoulder-press", sets: 3, reps: "10-12", rest: 90 },
    { day: "push", id: "lean-lateral", sets: 4, reps: "12-15", rest: 60 },
    { day: "push", id: "pushdown", sets: 3, reps: "12-15", rest: 60 },
    { day: "push", id: "cross-extension", sets: 3, reps: "12-15", rest: 60 },
    { day: "pull", id: "neutral-lat", sets: 4, reps: "10-12", rest: 90 },
    { day: "pull", id: "single-row", sets: 3, reps: "10-12", rest: 75 },
    { day: "pull", id: "pullover", sets: 3, reps: "12-15", rest: 60 },
    { day: "pull", id: "face-pull", sets: 4, reps: "15-20", rest: 60 },
    { day: "pull", id: "pump-lateral", sets: 3, reps: "15-20", rest: 60 },
    { day: "pull", id: "spider-curl", sets: 3, reps: "10-12", rest: 60 },
    { day: "pull", id: "hammer-wrist", sets: 4, reps: "12-15", rest: 60 },
    { day: "lower-b", id: "db-rdl", sets: 3, reps: "10-12", rest: 90 },
    { day: "lower-b", id: "bulgarian", sets: 2, reps: "10-12", rest: 75 },
    { day: "lower-b", id: "slow-extension", sets: 3, reps: "12-15", rest: 60 },
    { day: "lower-b", id: "seated-calf", sets: 3, reps: "15-20", rest: 60 },
    { day: "lower-b", id: "reverse-crunch", sets: 4, reps: "12-15", rest: 60 },
    { day: "lower-b", id: "vacuum", sets: 4, reps: "30-30", rest: 45 },
    { day: "lower-b", id: "side-neck", sets: 3, reps: "15-20", rest: 60 },
  ]);
});
test("progression requires the same weight and all prescribed sets at the top range", () => {
  const ex = PLAN[0].exercises[0];
  const m = makeSession(PLAN[0], [], "id", now).movements[0];
  m.sets = m.sets.map((s) => ({ ...s, weight: "30", reps: "12", done: true }));
  assert.equal(canProgress(m, ex), true);
  m.sets[1].done = false;
  assert.equal(canProgress(m, ex), false);
  m.sets[1].done = true;
  m.sets[1].weight = "25";
  assert.equal(canProgress(m, ex), false);
});
test("new session carries previous numbers but never completion flags", () => {
  const s = makeSession(PLAN[0], [], "old", now);
  s.finishedAt = now;
  s.movements[0].sets[0] = { weight: "35", reps: "12", done: true };
  const fresh = makeSession(PLAN[0], [s], "new", "2026-11-02T10:00:00.000Z");
  assert.deepEqual(fresh.movements[0].sets[0], {
    weight: "35",
    reps: "12",
    done: false,
  });
  assert.equal(
    previousMovement([s], s.movements[0].exerciseId, "old"),
    undefined,
  );
});
test("volume counts only completed weighted reps and excludes timed holds", () => {
  const s = makeSession(PLAN[4], [], "id", now);
  s.movements[0].sets[0] = { weight: "20", reps: "10", done: true };
  s.movements[0].sets[1] = { weight: "20", reps: "12", done: false };
  s.movements.find((m) => m.exerciseId === "vacuum")!.sets[0] = {
    weight: "",
    reps: "30",
    done: true,
  };
  assert.equal(volume(s), 200);
  assert.equal(completedSets(s), 2);
});
test("sync merge never overwrites a newer local session with stale remote data", () => {
  const a = makeSession(PLAN[0], [], "same", now);
  const b = { ...a, updatedAt: "2026-10-26T11:00:00.000Z", note: "newer" };
  assert.equal(mergeSessions([b], [a])[0].note, "newer");
  assert.equal(mergeSessions([a], [b])[0].note, "newer");
});
test("suggested day and dates use India time at day boundaries", () => {
  assert.equal(nextDay(new Date("2026-10-25T23:00:00Z")).id, "upper");
  assert.equal(nextDay(new Date("2026-10-28T09:00:00Z")).id, "push");
  assert.equal(localDate("2026-10-25T23:00:00Z"), "2026-10-26");
});

test("discarded sessions never become previous-session targets", () => {
  const s = makeSession(PLAN[0], [], "discarded", now);
  s.finishedAt = now;
  s.discardedAt = now;
  assert.equal(previousMovement([s], s.movements[0].exerciseId), undefined);
});

test("targets use completed work, fill missing sets, and skip untouched exercises", () => {
  const older = makeSession(PLAN[0], [], "older", now);
  older.finishedAt = now;
  older.movements[1].sets[0] = { weight: "15", reps: "11", done: true };
  const recent = makeSession(PLAN[0], [], "recent", "2026-10-27T10:00:00.000Z");
  recent.finishedAt = recent.startedAt;
  recent.movements[0].sets[0] = { weight: "35", reps: "12", done: true };
  recent.movements[0].sets[1] = { weight: "999", reps: "1", done: false };
  const fresh = makeSession(PLAN[0], [recent, older], "new", now);
  assert.ok(
    fresh.movements[0].sets.every(
      (s) => s.weight === "35" && s.reps === "12" && !s.done,
    ),
  );
  assert.equal(fresh.movements[1].sets[0].weight, "15");
});

test("focused defaults carry forward without changing completed sets or other exercises", () => {
  const session = makeSession(PLAN[0], [], "id", now);
  session.movements[0].sets[0] = { weight: "30", reps: "10", done: true };
  const weighted = editSet(session, 0, 1, "weight", "32.5", true);
  const edited = editSet(weighted, 0, 1, "reps", "11", true);
  assert.deepEqual(edited.movements[0].sets[0], session.movements[0].sets[0]);
  assert.ok(
    edited.movements[0].sets
      .slice(1)
      .every((s) => s.weight === "32.5" && s.reps === "11" && !s.done),
  );
  assert.deepEqual(edited.movements[1], session.movements[1]);
  assert.equal(session.movements[0].sets[1].weight, "");
});

test("correcting a completed set retains its completion and other set values", () => {
  const session = makeSession(PLAN[0], [], "id", now);
  session.movements[0].sets[0] = { weight: "30", reps: "10", done: true };
  const edited = editSet(session, 0, 0, "reps", "9");
  assert.equal(edited.movements[0].sets[0].done, true);
  assert.equal(edited.movements[0].sets[0].reps, "9");
  assert.deepEqual(edited.movements[0].sets[1], session.movements[0].sets[1]);
});

test("supersets alternate A and B each round and recover uneven saved logs", () => {
  for (const day of PLAN) {
    for (const ex of day.exercises.filter((e) => e.superset)) {
      const session = makeSession(day, [], "pair", now);
      const a = session.movements.findIndex(
        (m) => m.exerciseId === ex.id + "-a",
      );
      const b = a + 1;
      assert.equal(supersetPartner(session, ex, a), session.movements[b]);
      for (let round = 0; round < ex.sets; round++) {
        assert.equal(supersetFocus(session, ex, b), a);
        assert.equal(supersetPartner(session, ex, a)!.sets[round].done, false);
        session.movements[a].sets[round].done = true;
        assert.equal(supersetFocus(session, ex, a), b);
        assert.equal(supersetPartner(session, ex, b)!.sets[round].done, true);
        session.movements[b].sets[round].done = true;
      }
      assert.equal(supersetFocus(session, ex, a), a);
      session.movements[b].sets[0].done = false;
      assert.equal(supersetFocus(session, ex, a), b);
      session.movements[a].sets[0].done = false;
      assert.equal(supersetFocus(session, ex, b), a);
    }
  }
});

test("records require history and beat load then reps, with ties excluded", async () => {
  const { isRecord } = await import("../lib/records.ts");
  const prior = makeSession(PLAN[0], [], "prior", now);
  prior.finishedAt = now;
  prior.movements[0].sets[0] = { weight: "20", reps: "10", done: true };
  const current = makeSession(PLAN[0], [prior], "current", now);
  const set = current.movements[0].sets[0];
  assert.equal(isRecord([], current, 0, 0), false);
  assert.equal(isRecord([prior], current, 0, 0), false);
  set.weight = "21"; set.reps = "8";
  assert.equal(isRecord([prior], current, 0, 0), true);
  set.weight = "20"; set.reps = "11";
  assert.equal(isRecord([prior], current, 0, 0), true);
  set.weight = "19"; set.reps = "20";
  assert.equal(isRecord([prior], current, 0, 0), false);
  set.weight = "20"; set.reps = "11"; set.done = true;
  current.movements[0].sets[1] = { ...set };
  assert.equal(isRecord([prior], current, 0, 1), false);
  assert.equal(isRecord([{ ...prior, discardedAt: now }], current, 0, 0), false);
  set.reps = "12";
  assert.equal(isRecord([prior], current, 0, 0, true), true);
});

test("saved Tuesday neck extension is removed while flexion sets survive sync", () => {
  const session = makeSession(PLAN[1], [], "old-tuesday", now);
  const flexion = session.movements.find((m) => m.exerciseId === "neck-flex")!;
  flexion.exerciseId = "neck-flex-a";
  flexion.sets[0] = { weight: "5", reps: "18", done: true };
  session.movements.push({ ...flexion, exerciseId: "neck-flex-b", name: "extension" });
  const [fixed] = mergeSessions([session], []);
  assert.equal(fixed.movements.some((m) => m.exerciseId === "neck-flex-b"), false);
  assert.deepEqual(fixed.movements.find((m) => m.exerciseId === "neck-flex")?.sets, flexion.sets);
  assert.deepEqual(fixed.movements.filter((m) => m.exerciseId !== "neck-flex"), session.movements.filter((m) => !m.exerciseId.startsWith("neck-flex")));
  assert.deepEqual(mergeSessions([fixed], [session]), [fixed]);
  assert.deepEqual(mergeSessions([], [session])[0].movements, fixed.movements);
});
