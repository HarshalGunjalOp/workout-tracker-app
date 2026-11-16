import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN as CURRENT_PLAN, nextDay, totalSets, workoutDay } from "../lib/plan.ts";
import { LEGACY_PLAN as PLAN } from "../lib/legacy-plan.ts";
import { sessionSchema } from "../lib/schema.ts";
import {
  makeSession,
  supersetFocus,
  supersetPartner,
  canProgress,
  mergeSessions,
  volume,
  completedSets,
  nextWorkoutFocus,
  pendingWarmup,
  remainingSets,
  suggestedWarmupLoad,
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
test("historical workout presets preserve the original prescriptions", () => {
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
  assert.equal(nextDay(new Date("2026-10-25T23:00:00Z")).id, "upper-a-v2");
  assert.equal(nextDay(new Date("2026-10-28T09:00:00Z")).id, "upper-b-v2");
  assert.equal(nextDay(new Date("2026-11-13T09:00:00Z")).id, "lower-b-v2");
  assert.equal(nextDay(new Date("2026-11-14T09:00:00Z")).id, "upper-c-v2");
  assert.equal(nextDay(new Date("2026-11-15T09:00:00Z")).id, "upper-a-v2");
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

test("each PR compares with the latest completed log for that set number", async () => {
  const { isRecord } = await import("../lib/records.ts");
  const older = makeSession(PLAN[0], [], "older", "2026-10-12T10:00:00.000Z");
  older.finishedAt = older.startedAt;
  older.movements[0].sets[1] = { weight: "20", reps: "14", done: true };
  const last = makeSession(PLAN[0], [], "last", "2026-10-19T10:00:00.000Z");
  last.finishedAt = last.startedAt;
  last.movements[0].sets[0] = { weight: "20", reps: "12", done: true };
  last.movements[0].sets[1] = { weight: "20", reps: "9", done: true };
  last.movements[0].sets[2] = { weight: "20", reps: "11", done: false };
  const current = makeSession(PLAN[0], [], "current", now);
  current.movements[0].sets[0] = { weight: "20", reps: "13", done: true };
  current.movements[0].sets[1] = { weight: "20", reps: "10", done: true };
  current.movements[0].sets[2] = { weight: "20", reps: "12", done: true };

  assert.equal(isRecord([older, last, current], current, 0, 0), true);
  assert.equal(isRecord([older, last, current], current, 0, 1), true);
  assert.equal(isRecord([older, last, current], current, 0, 2), false);
  current.movements[0].sets[1].reps = "9";
  assert.equal(isRecord([older, last], current, 0, 1), false);
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

test("switching defers an exercise and automatic progression returns to it last", async () => {
  const { workoutQueue, nextWorkoutFocus } = await import("../lib/training.ts");
  const day = PLAN[0];
  const session = makeSession(day, [], "queue", now);
  const deferred = [day.exercises[0].id];
  const firstId = session.movements[0].exerciseId;
  assert.equal(workoutQueue(session, day, deferred).at(-1)?.id, day.exercises[0].id);
  const next = nextWorkoutFocus(session, day, deferred);
  assert.notEqual(next, 0);
  // Continue the selected exercise until it is complete.
  assert.equal(nextWorkoutFocus(session, day, deferred, session.movements[next].exerciseId), next);
  session.movements.forEach((m, i) => { if (i !== 0) m.sets.forEach(s => { s.done = true; }); });
  assert.equal(nextWorkoutFocus(session, day, deferred), 0);
  session.movements[0].sets.forEach(s => { s.done = true; });
  assert.equal(nextWorkoutFocus(session, day, deferred, firstId), -1);
  assert.equal(workoutQueue(session, day, deferred).length, 0);
});

test("switching keeps supersets together and returns to their earliest unfinished round", async () => {
  const { workoutQueue, nextWorkoutFocus, movementsFor } = await import("../lib/training.ts");
  const day = PLAN.find(d => d.exercises.some(e => e.superset))!;
  const ex = day.exercises.find(e => e.superset)!;
  const session = makeSession(day, [], "pair-queue", now);
  const parts = movementsFor(ex);
  const a = session.movements.findIndex(m => m.exerciseId === parts[0].id);
  const b = session.movements.findIndex(m => m.exerciseId === parts[1].id);
  session.movements[a].sets[0].done = true;
  assert.equal(nextWorkoutFocus(session, day, [], parts[0].id), b);
  assert.notEqual(nextWorkoutFocus(session, day, [ex.id]), a);
  assert.notEqual(nextWorkoutFocus(session, day, [ex.id]), b);
  session.movements.forEach((m, i) => { if (i !== a && i !== b) m.sets.forEach(s => { s.done = true; }); });
  assert.equal(workoutQueue(session, day, [ex.id]).length, 1);
  assert.equal(nextWorkoutFocus(session, day, [ex.id]), b);
  const restored = JSON.parse(JSON.stringify({ session, deferred: [ex.id], focus: parts[0].id }));
  assert.equal(nextWorkoutFocus(restored.session, day, restored.deferred, restored.focus), b);
});

test("new V-taper prescriptions match the PDF in workout order", () => {
  assert.deepEqual(CURRENT_PLAN.map(day => [day.day, day.title, totalSets(day)]), [
    ["Monday", "Upper A", 19],
    ["Tuesday", "Lower A", 21],
    ["Thursday", "Upper B", 20],
    ["Friday", "Lower B", 21],
    ["Saturday", "Upper C", 21],
  ]);
  assert.deepEqual(CURRENT_PLAN.map(day => day.exercises.map(ex =>
    `${ex.id} ${ex.sets}×${ex.min}–${ex.max}${ex.perSide ? "/side" : ""} ${ex.progression} ${ex.warmupCode}`)), [
    [
      "medium-lat 4×6–10 T W3",
      "cable-lateral 4×12–20/side D W1",
      "smith-incline 4×5–8 T W2",
      "supported-row 3×8–12 T W1",
      "incline-curl 2×8–12 D W0",
      "pushdown 2×10–15 D W0",
    ],
    [
      "smith-squat 3×5–8 T W3",
      "leg-extension 3×8–12 T W1",
      "leg-curl 3×8–12 T W1",
      "standing-calf 3×10–20 D W1",
      "db-lateral 2×12–20 D W1",
      "rope-crunch 3×10–15 D W0",
      "cable-reverse-curl 2×10–15 D W0",
      "unloaded-neck-flex 2×12–20 N WN",
    ],
    [
      "db-lateral 4×12–20 D W1",
      "lat-pulldown 4×6–10 T W2",
      "shoulder-press 2×6–10 T W2",
      "smith-flat 3×5–8 T W2",
      "cable-rear-fly 3×12–20 D W1",
      "preacher-curl 2×8–12 D W1",
      "overhead-rope 2×10–15 D W1",
    ],
    [
      "supported-split-squat 3×8–12/side T W3",
      "leg-curl 4×8–12 T W1",
      "leg-extension 2×10–15 T W1",
      "floor-glute-bridge 2×10–15 D W1",
      "standing-calf 3×10–20 D W1",
      "reverse-crunch 3×10–20 D W0",
      "wrist-curl-machine 2×12–20 D W1",
      "unloaded-side-neck 2×12–20/side N WN",
    ],
    [
      "lat-pulldown 5×6–10 T W3",
      "supported-row 3×8–12 T W1",
      "cable-lateral 4×12–20/side D W1",
      "smith-incline 3×6–10 T W2",
      "cable-rear-fly 2×12–20 D W1",
      "incline-curl 2×8–12 D W0",
      "pushdown 2×10–15 D W0",
    ],
  ]);
  for (const day of PLAN) assert.equal(workoutDay(day.id), day);
});

test("uncapped progression uses the first and last working sets at the same load", () => {
  const day = CURRENT_PLAN[0];
  const session = makeSession(day, [], "id", now);
  session.finishedAt = now;
  const movement = session.movements[0];
  const ex = day.exercises[0];
  movement.sets = [13, 9, 8, 6].map(reps => ({ weight: "35", reps: String(reps), done: true }));
  assert.equal(canProgress(movement, ex), true);
  assert.equal(makeSession(day, [session], "next", now).movements[0].sets[0].reps, "13");
  movement.sets[3].reps = "5";
  assert.equal(canProgress(movement, ex), false);
  movement.sets[3].reps = "6";
  movement.sets[1].done = false;
  assert.equal(canProgress(movement, ex), false);
  movement.sets[1].done = true;
  movement.sets[3].weight = "30";
  assert.equal(canProgress(movement, ex), false);
});

test("new neck exercises start unloaded even when the old plan logged plate work", () => {
  const old = makeSession(PLAN[1], [], "old", now);
  old.finishedAt = now;
  old.movements.find(m => m.exerciseId === "neck-flex")!.sets[0] = { weight: "5", reps: "20", done: true };
  const day = CURRENT_PLAN[1];
  const session = makeSession(day, [old], "new", now);
  const neck = session.movements.at(-1)!;
  assert.deepEqual(neck.sets, Array.from({ length: 2 }, () => ({ weight: "0", reps: "12", done: false })));
  neck.sets = neck.sets.map(() => ({ weight: "1", reps: "20", done: true }));
  assert.equal(canProgress(neck, day.exercises.at(-1)!), false);
});

test("ramp progress survives session validation without adding working sets or volume", () => {
  const day = CURRENT_PLAN[0];
  const session = makeSession(day, [], crypto.randomUUID(), now);
  const movement = session.movements[0];
  const ex = day.exercises[0];
  assert.deepEqual(pendingWarmup(movement, ex), { fraction: 0.4, reps: "8–10", number: 1, total: 3 });
  assert.equal(suggestedWarmupLoad("", 0.4, 2.5), undefined);
  assert.equal(suggestedWarmupLoad("0", 0.4, 2.5), undefined);
  assert.equal(suggestedWarmupLoad("37.5", 0.8, 2.5), 30);
  assert.equal(suggestedWarmupLoad("10", 0.8, 5), 5);
  assert.equal(suggestedWarmupLoad("2.5", 0.8, 2.5), undefined);
  movement.warmupsDone = 1;
  session.generalWarmupDone = true;
  session.deferredExerciseIds = [ex.id];
  const restored = sessionSchema.parse(JSON.parse(JSON.stringify(session)));
  assert.equal(restored.generalWarmupDone, true);
  assert.deepEqual(pendingWarmup(restored.movements[0], ex), { fraction: 0.6, reps: "5", number: 2, total: 3 });
  assert.equal(nextWorkoutFocus(restored, day), 1);
  assert.equal(completedSets(restored), 0);
  assert.equal(volume(restored), 0);
  assert.equal(remainingSets(restored), totalSets(day));
  restored.movements[0].warmupsDone = 3;
  assert.equal(pendingWarmup(restored.movements[0], ex), undefined);
});

test("warm-up variants preserve unloaded practice, optional ramps and legacy logging", () => {
  const day = CURRENT_PLAN[1];
  const session = makeSession(day, [], crypto.randomUUID(), now);
  const movement = session.movements.at(-1)!;
  const ex = day.exercises.at(-1)!;
  assert.deepEqual(pendingWarmup(movement, ex), { fraction: null, reps: "5–8", number: 1, total: 1 });
  assert.equal(pendingWarmup(movement, { ...ex, warmupCode: "W0" }), undefined);
  assert.equal(pendingWarmup(movement, { ...ex, timed: true }), undefined);
  assert.equal(pendingWarmup(movement, { ...ex, warmupCode: undefined }), undefined);
  assert.equal(pendingWarmup(movement, { ...ex, warmupCode: "W1" })?.reps, "8–12");
  movement.warmupsDone = 1;
  assert.deepEqual(pendingWarmup(movement, { ...ex, warmupCode: "W2" }), { fraction: 0.75, reps: "3–4", number: 2, total: 2 });
  delete movement.warmupsDone;
  movement.sets[0].done = true;
  assert.equal(pendingWarmup(movement, ex), undefined);
});
