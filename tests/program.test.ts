import { test } from "node:test";
import assert from "node:assert/strict";
import { PLAN, totalSets } from "../lib/plan.ts";
import { mergeProgram, resolveProgram, programDaySchema, savedProgramSchema } from "../lib/program.ts";
import { sessionSchema } from "../lib/schema.ts";
import { makeSession, volume } from "../lib/training.ts";
const earlier = "2026-10-28T10:00:00.000Z";
const later = "2026-10-28T11:00:00.000Z";
test("personalized program drives session names, set counts and new rep targets", () => {
  const custom = structuredClone(PLAN[0]);
  custom.title = "My upper day";
  custom.exercises[0] = { ...custom.exercises[0], name: "My pulldown", sets: 2, min: 6, max: 8, rest: 30 };
  const previous = makeSession(PLAN[0], [], crypto.randomUUID(), earlier);
  previous.finishedAt = earlier;
  previous.movements[0].sets.forEach(set => { set.done = true; set.weight = "25"; set.reps = "12"; });
  const session = makeSession(custom, [previous], crypto.randomUUID(), later);
  assert.equal(session.movements[0].name, "My pulldown");
  assert.equal(session.movements[0].sets.length, 2);
  assert.deepEqual(session.movements[0].sets[0], { done: false, weight: "25", reps: "6" });
  assert.equal(session.movements.reduce((n, m) => n + m.sets.length, 0), totalSets(custom));
  assert.ok(sessionSchema.safeParse(session).success);
  custom.title = "Another name";
  custom.exercises[0].sets = 9;
  assert.equal(session.programDay?.title, "My upper day");
  assert.equal(session.programDay?.exercises[0].sets, 2);
  assert.equal(previous.movements[0].sets.length, 4);
});
test("different devices merge edits per workout and newer changes win", () => {
  const local = savedProgramSchema.parse([{ day: { ...PLAN[0], title: "Latest" }, updatedAt: later }]);
  const remote = savedProgramSchema.parse([{ day: { ...PLAN[0], title: "Stale" }, updatedAt: earlier }, { day: PLAN[1], updatedAt: earlier }]);
  const merged = mergeProgram(local, remote);
  assert.equal(merged.length, 2);
  assert.equal(resolveProgram(merged)[0].title, "Latest");
  assert.equal(resolveProgram(merged)[2].title, PLAN[2].title);
  assert.deepEqual(mergeProgram(remote, local), merged);
  assert.ok(savedProgramSchema.safeParse(merged).success);
});
test("program validation rejects invalid ranges, counts, empty names and broken supersets", () => {
  for (const patch of [{ sets: 0 }, { sets: 21 }, { min: 15, max: 12 }, { rest: -1 }, { name: " " }, { superset: true, name: "Missing partner" }]) {
    const day = structuredClone(PLAN[0]);
    Object.assign(day.exercises[0], patch);
    assert.equal(programDaySchema.safeParse(day).success, false, JSON.stringify(patch));
  }
  const duplicate = structuredClone(PLAN[0]);
  duplicate.exercises.push(duplicate.exercises[0]);
  assert.equal(programDaySchema.safeParse(duplicate).success, false);
});
test("adding, removing and reordering exercises retains stable movement identities", () => {
  const custom = structuredClone(PLAN[0]);
  custom.exercises = [custom.exercises[2], { ...custom.exercises[0], id: "custom-new", name: "New movement" }];
  const session = makeSession(custom, [], crypto.randomUUID(), later);
  assert.deepEqual(session.movements.map(m => m.exerciseId), ["supported-row", "custom-new"]);
  assert.ok(sessionSchema.safeParse(session).success);
});
test("custom timed holds do not count toward volume and legacy sessions remain valid", () => {
  const custom = structuredClone(PLAN[0]);
  custom.exercises = [{ ...custom.exercises[0], id: "custom-hold", timed: true }];
  const session = makeSession(custom, [], crypto.randomUUID(), later);
  session.movements[0].sets[0] = { done: true, weight: "10", reps: "30" };
  assert.equal(volume(session), 0);
  delete session.programDay;
  assert.ok(sessionSchema.safeParse(session).success);
});
