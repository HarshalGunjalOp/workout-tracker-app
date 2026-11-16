import { LEGACY_PLAN } from "./legacy-plan.ts";

export const WARMUP_SETS = {
  W3: [{ fraction: 0.4, reps: "8–10" }, { fraction: 0.6, reps: "5" }, { fraction: 0.8, reps: "2–3" }],
  W2: [{ fraction: 0.5, reps: "8" }, { fraction: 0.75, reps: "3–4" }],
  W1: [{ fraction: 0.5, reps: "8–12" }],
  W0: [],
  WN: [{ fraction: null, reps: "5–8" }],
};

function rampDescription(sets: { fraction: number; reps: string }[]) {
  const prescription = sets.map(set => `${set.fraction * 100}% × ${set.reps}`).join(", ");
  return `${sets.length} ramp ${sets.length === 1 ? "set" : "sets"} · ${prescription}`;
}

export const WARMUPS = {
  W3: rampDescription(WARMUP_SETS.W3),
  W2: rampDescription(WARMUP_SETS.W2),
  W1: rampDescription(WARMUP_SETS.W1),
  W0: "No scheduled ramp set. Add a light set if needed.",
  WN: `${WARMUP_SETS.WN[0].reps} slow, unloaded practice reps`,
};

export const LEGACY_DAY_IDS = ["upper", "lower-a", "push", "pull", "lower-b"] as const;
export const DAY_IDS = ["upper-a-v2", "lower-a-v2", "upper-b-v2", "lower-b-v2", "upper-c-v2"] as const;

export type Exercise = {
  id: string;
  name: string;
  muscle: string;
  sets: number;
  min: number;
  max: number;
  rest: number;
  cue: string;
  weightStep?: number;
  timed?: boolean;
  superset?: boolean;
  warmupCode?: keyof typeof WARMUPS;
  progression?: "T" | "D" | "N";
  perSide?: boolean;
};
export type Day = {
  id: string;
  day: string;
  short: string;
  weekday: number;
  title: string;
  label: string;
  focus: string;
  minutes: number;
  warmup: string;
  exercises: Exercise[];
};

const workingWeight = "Warm-up percentages use your planned working weight. Keep ramp sets easy.";
const oneRepLeft = " Stop with about one rep in reserve.";
const technicalFailure = " Strict technical failure is optional if tolerated.";

const e = (
  id: string, name: string, muscle: string,
  sets: number, min: number, max: number, progression: NonNullable<Exercise["progression"]>,
  warmupCode: keyof typeof WARMUPS, rest: number, cue: string, perSide?: boolean,
): Exercise => ({ id, name, muscle, sets, min, max, progression, warmupCode, rest, cue, ...(perSide ? { perSide } : {}) });

export const PLAN: Day[] = [
  {
    id: "upper-a-v2", day: "Monday", short: "MON", weekday: 1, title: "Upper A",
    label: "Lats, side delts & upper chest", focus: "Lats · Side delts · Upper chest",
    minutes: 75, warmup: workingWeight,
    exercises: [
      e("medium-lat", "Lat pulldown (medium/neutral grip)", "Lats", 4, 6, 10, "T", "W3", 150,
        "Secure your thighs and pull your elbows toward your ribs without swinging." + technicalFailure),
      e("cable-lateral", "Single-arm cable lateral raise", "Side delts", 4, 12, 20, "D", "W1", 90,
        "Set the pulley low and raise slightly forward of your side with a soft elbow.", true),
      e("smith-incline", "Smith incline bench press", "Upper chest", 4, 5, 8, "T", "W2", 150,
        "Set the bench to 15–30° and set the safety stops. Lower toward your upper chest." + oneRepLeft),
      e("supported-row", "Chest-supported dumbbell row", "Mid-back · Lats", 3, 8, 12, "T", "W1", 150,
        "Lie face down on an incline bench and row without lifting your torso." + technicalFailure),
      e("incline-curl", "Incline dumbbell biceps curl", "Biceps", 2, 8, 12, "D", "W0", 90,
        "Let your arms hang from the incline bench and curl without swinging your shoulders."),
      e("pushdown", "Cable triceps pushdown", "Triceps", 2, 10, 15, "D", "W0", 90,
        "Keep your upper arms by your sides and extend your elbows smoothly."),
    ],
  },
  {
    id: "lower-a-v2", day: "Tuesday", short: "TUE", weekday: 2, title: "Lower A",
    label: "Quads, calves, abs, forearms & neck", focus: "Quads · Calves · Abs · Forearms · Neck",
    minutes: 80, warmup: workingWeight,
    exercises: [
      e("smith-squat", "Smith machine squat", "Quads · Glutes", 3, 5, 8, "T", "W3", 150,
        "Set the safety stops, brace, and use a comfortable, slightly forward foot position." + oneRepLeft),
      e("leg-extension", "Leg extension", "Quads", 3, 8, 12, "T", "W1", 105,
        "Align your knees with the pivot and extend smoothly without jerking." + technicalFailure),
      e("leg-curl", "Leg curl machine", "Hamstrings", 3, 8, 12, "T", "W1", 105,
        "Align your knees with the pivot, keep your hips against the pad, and control the lowering." + technicalFailure),
      e("standing-calf", "Smith standing calf raise", "Calves", 3, 10, 20, "D", "W1", 90,
        "Secure the bar on your upper traps and use a stable surface for controlled heel raises."),
      e("db-lateral", "Dumbbell lateral raise", "Side delts", 2, 12, 20, "D", "W1", 90,
        "Lift slightly forward of your sides without swinging or shrugging."),
      e("rope-crunch", "Kneeling cable crunch", "Abs", 3, 10, 15, "D", "W0", 90,
        "Curl your ribs toward your pelvis while keeping your hips nearly still."),
      e("cable-reverse-curl", "Cable reverse curl", "Forearms", 2, 10, 15, "D", "W0", 90,
        "Use an overhand grip with a straight or EZ attachment and keep your elbows close."),
      e("unloaded-neck-flex", "Lying neck flexion", "Neck", 2, 12, 20, "N", "WN", 90,
        "With your head near the bench edge, slowly nod through a small, pain-free range."),
    ],
  },
  {
    id: "upper-b-v2", day: "Thursday", short: "THU", weekday: 4, title: "Upper B",
    label: "Side delts, lats, chest & arms", focus: "Side delts · Lats · Chest · Arms",
    minutes: 80, warmup: workingWeight,
    exercises: [
      e("db-lateral", "Dumbbell lateral raise", "Side delts", 4, 12, 20, "D", "W1", 90,
        "Raise slightly ahead of your sides without shrugging or swinging."),
      e("lat-pulldown", "Lat pulldown", "Lats", 4, 6, 10, "T", "W2", 150,
        "Lock your thighs under the pad and pull your elbows down with a quiet torso." + technicalFailure),
      e("shoulder-press", "Seated dumbbell shoulder press", "Shoulders", 2, 6, 10, "T", "W2", 150,
        "Sit with your back supported. Use a neutral or semi-neutral grip and pain-free depth." + oneRepLeft),
      e("smith-flat", "Flat Smith bench press", "Chest", 3, 5, 8, "T", "W2", 150,
        "Set the safety stops and lower the bar using a comfortable elbow angle." + oneRepLeft),
      e("cable-rear-fly", "Cable rear-delt fly", "Rear delts", 3, 12, 20, "D", "W1", 90,
        "Set the pulleys near shoulder height and open your arms without shrugging."),
      e("preacher-curl", "Preacher curl", "Biceps", 2, 8, 12, "D", "W1", 90,
        "Place your upper arms firmly on the pad and control the lowering into extension."),
      e("overhead-rope", "Overhead cable triceps extension", "Triceps", 2, 10, 15, "D", "W1", 90,
        "Face away from a high cable and extend your elbows with your upper arms steady."),
    ],
  },
  {
    id: "lower-b-v2", day: "Friday", short: "FRI", weekday: 5, title: "Lower B",
    label: "Hamstrings, glutes & accessories", focus: "Hamstrings · Glutes · Abs · Forearms · Neck",
    minutes: 80, warmup: workingWeight,
    exercises: [
      e("supported-split-squat", "Supported dumbbell split squat", "Quads · Glutes", 3, 8, 12, "T", "W3", 150,
        "Hold the rack with one hand and the dumbbell in the other. Lower steadily." + oneRepLeft, true),
      e("leg-curl", "Leg curl machine", "Hamstrings", 4, 8, 12, "T", "W1", 105,
        "Keep your hips planted and lower smoothly through a controlled range." + technicalFailure),
      e("leg-extension", "Leg extension", "Quads", 2, 10, 15, "T", "W1", 105,
        "Align your knees with the pivot and extend without forcing the lockout." + technicalFailure),
      e("floor-glute-bridge", "Dumbbell floor glute bridge", "Glutes", 2, 10, 15, "D", "W1", 90,
        "Pad the dumbbell across your hips and raise your pelvis without arching your lower back."),
      e("standing-calf", "Smith standing calf raise", "Calves", 3, 10, 20, "D", "W1", 90,
        "Secure the bar and lift and lower your heels without bouncing."),
      e("reverse-crunch", "Reverse crunch", "Lower abs", 3, 10, 20, "D", "W0", 90,
        "Curl your pelvis upward without swinging your legs. Once all sets reach 20 clean reps, increase range or add a small load."),
      e("wrist-curl-machine", "Wrist curl machine", "Forearms", 2, 12, 20, "D", "W1", 90,
        "Keep your forearms on the pad and flex your wrists through a comfortable range."),
      e("unloaded-side-neck", "Lying side-neck raise", "Neck", 2, 12, 20, "N", "WN", 90,
        "Lie on your side with your head at the bench edge and lift gently without twisting.", true),
    ],
  },
  {
    id: "upper-c-v2", day: "Saturday", short: "SAT", weekday: 6, title: "Upper C",
    label: "Lats, back thickness & side delts", focus: "Lats · Back thickness · Side delts",
    minutes: 80, warmup: workingWeight,
    exercises: [
      e("lat-pulldown", "Lat pulldown", "Lats", 5, 6, 10, "T", "W3", 150,
        "Secure your thighs and pull your elbows down without rocking backward." + technicalFailure),
      e("supported-row", "Chest-supported dumbbell row", "Mid-back · Lats", 3, 8, 12, "T", "W1", 150,
        "Brace your chest on an incline bench and row toward your lower ribs." + technicalFailure),
      e("cable-lateral", "Cable lateral raise", "Side delts", 4, 12, 20, "D", "W1", 90,
        "Use a low pulley and raise your arm slightly forward of your side.", true),
      e("smith-incline", "Smith incline bench press", "Upper chest", 3, 6, 10, "T", "W2", 150,
        "Set the bench to 15–30° and set the safety stops. Lower comfortably." + oneRepLeft),
      e("cable-rear-fly", "Cable rear-delt fly", "Rear delts", 2, 12, 20, "D", "W1", 90,
        "Set the pulleys near shoulder height and open your arms without shrugging."),
      e("incline-curl", "Incline dumbbell curl", "Biceps", 2, 8, 12, "D", "W0", 90,
        "Keep your back against the incline bench and curl without swinging your elbows."),
      e("pushdown", "Cable triceps pushdown", "Triceps", 2, 10, 15, "D", "W0", 90,
        "Keep your upper arms against your sides and extend your elbows smoothly."),
    ],
  },
];

export const workoutDay = (id: string) =>
  PLAN.find(day => day.id === id) ?? LEGACY_PLAN.find(day => day.id === id);

export const repUnit = (ex: Exercise, timedUnit = "sec") =>
  ex.timed ? timedUnit : ex.perSide ? "reps/side" : "reps";

export function progressionTip(ex: Exercise): string | undefined {
  if (ex.timed) return;
  const side = ex.perSide ? " per side" : "";
  switch (ex.progression) {
    case "T":
      return `Log actual reps, even above the range. Increase by the smallest step when the first set reaches ${ex.max}${side} and the last reaches ${ex.min}${side} at the same load with consistent technique.`;
    case "D":
      return `Keep the load until all ${ex.sets} sets reach ${ex.max} clean reps${side}, then use the smallest increase. Aim for 0–1 reps in reserve.`;
    case "N":
      return `Start unloaded or hand-assisted and stay well short of failure. Build to ${ex.sets} × ${ex.max}${side} comfortably before considering a tiny increase in resistance.`;
  }
}

export function nextDay(now = new Date()): Day {
  const weekday = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "short",
    })
      .format(now)
      .replace(/Sun/, "0")
      .replace(/Mon/, "1")
      .replace(/Tue/, "2")
      .replace(/Wed/, "3")
      .replace(/Thu/, "4")
      .replace(/Fri/, "5")
      .replace(/Sat/, "6"),
  );
  return PLAN.find((d) => d.weekday >= weekday) ?? PLAN[0];
}
export const totalSets = (day: Day) =>
  day.exercises.reduce((a, e) => a + e.sets * (e.superset ? 2 : 1), 0);
