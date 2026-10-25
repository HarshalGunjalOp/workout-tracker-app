import { z } from "zod";
export const sessionSchema = z.object({
  id: z.uuid(),
  dayId: z.enum(["upper", "lower-a", "push", "pull", "lower-b"]),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime(),
  note: z.string().max(2000),
  movements: z
    .array(
      z.object({
        exerciseId: z.string().max(80),
        name: z.string().max(150),
        note: z.string().max(1000),
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
          .max(20),
      }),
    )
    .max(30),
});
