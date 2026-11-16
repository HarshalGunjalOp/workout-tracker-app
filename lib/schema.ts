import { z } from "zod";
import { dayIdSchema, programDaySchema } from "./program.ts";
export const sessionSchema = z.object({
  id: z.uuid(),
  programDay: programDaySchema.optional(),
  dayId: dayIdSchema,
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
  discardedAt: z.iso.datetime().optional(),
  generalWarmupDone: z.boolean().optional(),
  deferredExerciseIds: z.array(z.string().max(78)).max(30).optional(),
  note: z.string().max(2000),
  movements: z
    .array(
      z.object({
        exerciseId: z.string().max(80),
        name: z.string().max(150),
        note: z.string().max(1000),
        warmupsDone: z.number().int().min(0).max(3).optional(),
        sets: z
          .array(
            z.object({
              weight: z
                .string()
                .max(8)
                .regex(/^\d*(\.\d*)?$/),
              reps: z.string().max(5).regex(/^\d*$/),
              done: z.boolean(),
            }),
          )
          .min(1)
          .max(20),
      }),
    )
    .min(1)
    .max(30),
});
