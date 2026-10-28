import { z } from "zod";
import { PLAN, type Day } from "./plan.ts";

export const programDaySchema = z.object({
  id: z.enum(["upper", "lower-a", "push", "pull", "lower-b"]),
  day: z.string().min(1).max(20),
  short: z.string().min(1).max(5),
  weekday: z.number().int().min(0).max(6),
  title: z.string().trim().min(1).max(150),
  label: z.string().trim().max(200),
  focus: z.string().trim().max(300),
  minutes: z.number().int().min(1).max(300),
  warmup: z.string().trim().max(2000),
  exercises: z.array(z.object({
    id: z.string().min(1).max(78),
    name: z.string().trim().min(1).max(150),
    muscle: z.string().trim().max(200),
    sets: z.number().int().min(1).max(20),
    min: z.number().int().min(1).max(99999),
    max: z.number().int().min(1).max(99999),
    rest: z.number().int().min(0).max(1800),
    cue: z.string().trim().max(2000),
    timed: z.boolean().optional(),
    superset: z.boolean().optional(),
  }).refine(ex => ex.max >= ex.min, "Maximum must be at least the minimum.")
    .refine(ex => !ex.superset || (ex.name.split(" + ").length === 2 && ex.name.split(" + ").every(n => n.trim())), "Separate the two superset names with +."))
    .min(1).max(30),
}).refine(day => new Set(day.exercises.map(ex => ex.id)).size === day.exercises.length, "Exercise IDs must be unique.")
  .refine(day => day.exercises.reduce((sum, ex) => sum + (ex.superset ? 2 : 1), 0) <= 30, "Use at most 30 movements per workout.")
  .refine(day => {
    const ids = day.exercises.flatMap(ex => ex.superset ? [ex.id + "-a", ex.id + "-b"] : [ex.id]);
    return new Set(ids).size === ids.length;
  }, "Movement IDs must be unique.");
export const savedDaySchema = z.object({ day: programDaySchema, updatedAt: z.iso.datetime() });
export const savedProgramSchema = z.array(savedDaySchema).max(5).refine(days => new Set(days.map(d => d.day.id)).size === days.length);
export type SavedDay = z.infer<typeof savedDaySchema>;
export function mergeProgram(local: SavedDay[], remote: SavedDay[]): SavedDay[] {
  const byId = new Map(local.map(entry => [entry.day.id, entry]));
  for (const entry of remote) {
    const previous = byId.get(entry.day.id);
    if (!previous || previous.updatedAt < entry.updatedAt) byId.set(entry.day.id, entry);
  }
  return [...byId.values()].sort((a, b) => a.day.id.localeCompare(b.day.id));
}
export function resolveProgram(saved: SavedDay[]): Day[] {
  return PLAN.map(original => {
    const custom = saved.find(entry => entry.day.id === original.id)?.day;
    // Scheduling stays anchored to the existing split.
    return custom ? { ...custom, day: original.day, short: original.short, weekday: original.weekday } : original;
  });
}
