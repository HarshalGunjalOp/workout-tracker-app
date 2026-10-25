import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN, nextDay, totalSets } from "../lib/plan.ts";
import {
  makeSession,
  canProgress,
  mergeSessions,
  volume,
  completedSets,
  previousMovement,
  localDate,
} from "../lib/training.ts";
const now = "2026-10-26T10:00:00.000Z";
test("all five program days preserve seven exercises and paired movements", () => {
  assert.equal(PLAN.length, 5);
  assert.ok(PLAN.every((d) => d.exercises.length === 7));
  assert.equal(totalSets(PLAN[0]), 24);
  const lower = makeSession(PLAN[1], [], "id", now);
  assert.equal(lower.movements.length, 9);
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
