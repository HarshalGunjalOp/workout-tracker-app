"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCheck,
  Minus,
  Plus,
  RotateCcw,
  Timer,
} from "lucide-react";
import type { Exercise } from "@/lib/plan";
import type { MovementLog, Session } from "@/lib/training";

const clock = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

function Stepper({
  label,
  value,
  step,
  onChange,
  unit,
}: {
  label: string;
  value: string;
  step: number;
  unit: string;
  onChange: (value: string) => void;
}) {
  const change = (direction: number) =>
    onChange(
      String(
        Math.min(
          99999,
          Math.max(
            unit === "kg" ? 0 : 1,
            Math.round(((Number(value) || 0) + direction * step) * 100) / 100,
          ),
        ),
      ),
    );
  return (
    <div className="quick-field">
      <label htmlFor={`quick-${unit}`}>
        {label} {label.toLowerCase() !== unit && <span>{unit}</span>}
      </label>
      <div className="quick-stepper">
        <button
          aria-label={`Decrease ${label.toLowerCase()}`}
          onClick={() => change(-1)}
          disabled={value !== "" && Number(value) <= (unit === "kg" ? 0 : 1)}
        >
          <Minus size={20} />
        </button>
        <input
          id={`quick-${unit}`}
          aria-label={label}
          type="text"
          inputMode={unit === "kg" ? "decimal" : "numeric"}
          value={value}
          placeholder="—"
          maxLength={unit === "kg" ? 8 : 5}
          onFocus={(e) => e.target.select()}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          aria-label={`Increase ${label.toLowerCase()}`}
          onClick={() => change(1)}
        >
          <Plus size={20} />
        </button>
      </div>
    </div>
  );
}

export function SetLogger({
  session,
  mi,
  ex,
  previous,
  seconds,
  resting,
  canUndo,
  onChange,
  onLog,
  onUndo,
  onLater,
  onRestMore,
  onRestSkip,
  onReview,
}: {
  session: Session;
  mi: number;
  ex?: Exercise;
  previous?: MovementLog;
  seconds: number;
  resting: boolean;
  canUndo: boolean;
  onChange: (field: "weight" | "reps", value: string) => void;
  onLog: () => void;
  onUndo: () => void;
  onLater: () => void;
  onRestMore: () => void;
  onRestSkip: () => void;
  onReview: () => void;
}) {
  const [weightStep, setWeightStep] = useState(2.5);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("form-weight-step"));
      if ([1.25, 2.5, 5].includes(saved)) setWeightStep(saved);
    } catch {}
  }, []);
  function chooseWeightStep(step: number) {
    setWeightStep(step);
    try {
      localStorage.setItem("form-weight-step", String(step));
    } catch {}
  }
  const m = session.movements[mi];
  const si = m?.sets.findIndex((s) => !s.done) ?? -1;
  const set = m?.sets[si];
  const allDone = session.movements.every((movement) =>
    movement.sets.every((s) => s.done),
  );
  if (!set || !ex || allDone)
    return (
      <section
        className="quick-logger quick-complete"
        aria-label="Workout complete"
      >
        <CheckCheck size={36} />
        <h2>Every set, done.</h2>
        <p>Your workout is ready to save.</p>
        <button className="lime-button quick-log" onClick={onReview}>
          Save workout <CheckCheck size={20} />
        </button>
        {canUndo && (
          <button className="quick-undo" onClick={onUndo}>
            <RotateCcw size={16} /> Undo last set
          </button>
        )}
      </section>
    );
  const last = previous?.sets[si]?.done
    ? previous.sets[si]
    : previous?.sets.filter((s) => s.done).at(-1);
  const valid =
    Number(set.reps) > 0 &&
    (ex.timed || (set.weight !== "" && Number.isFinite(Number(set.weight))));
  const otherPending = session.movements.some(
    (movement, i) => i !== mi && movement.sets.some((s) => !s.done),
  );
  return (
    <section className="quick-logger" aria-label="Next set">
      <div className="quick-overline">
        <span>
          {resting && seconds > 0 ? "RESTING · NEXT UP" : "YOUR NEXT SET"}
        </span>
        <span>
          EXERCISE {mi + 1} / {session.movements.length}
        </span>
      </div>
      <h2>{m.name}</h2>
      <div
        className="quick-set-progress"
        aria-label={`Set ${si + 1} of ${m.sets.length}`}
      >
        {m.sets.map((s, i) => (
          <span key={i} className={s.done ? "done" : i === si ? "current" : ""}>
            {s.done ? <Check size={13} /> : i + 1}
          </span>
        ))}
        <strong>
          Set {si + 1} of {m.sets.length}
        </strong>
      </div>
      <p className="quick-context">
        {last
          ? `Last time: ${ex.timed ? `${last.reps}s` : `${Number(last.weight) === 0 ? "Bodyweight" : `${last.weight} kg`} × ${last.reps}`}. Ready to repeat.`
          : ex.timed
            ? `${ex.min}s hold prepared for you.`
            : set.weight === ""
              ? `${ex.min}–${ex.max} reps prepared. Choose your weight once.`
              : `${Number(set.weight) === 0 ? "Bodyweight" : `${set.weight} kg`} ready. Target: ${ex.min}–${ex.max} reps.`}
      </p>
      <div className={"quick-values " + (ex.timed ? "timed" : "")}>
        {!ex.timed && (
          <Stepper
            label="Weight"
            unit="kg"
            value={set.weight}
            step={weightStep}
            onChange={(v) => onChange("weight", v)}
          />
        )}
        <Stepper
          label={ex.timed ? "Duration" : "Reps"}
          unit={ex.timed ? "sec" : "reps"}
          value={set.reps}
          step={ex.timed ? 5 : 1}
          onChange={(v) => onChange("reps", v)}
        />
      </div>
      {!ex.timed && (
        <div className="quick-shortcuts">
          <div
            className="weight-steps"
            role="group"
            aria-label="Weight adjustment size"
          >
            <span>KG STEP</span>
            {[1.25, 2.5, 5].map((n) => (
              <button
                key={n}
                aria-pressed={weightStep === n}
                onClick={() => chooseWeightStep(n)}
              >
                {n}
              </button>
            ))}
          </div>
          <button
            className="bodyweight-shortcut"
            aria-pressed={set.weight === "0"}
            onClick={() => onChange("weight", "0")}
          >
            Bodyweight
          </button>
        </div>
      )}
      {!ex.timed && (
        <div className="rep-shortcuts" role="group" aria-label="Quick reps">
          {Array.from(
            { length: Math.min(ex.max - ex.min + 1, 6) },
            (_, i) => ex.min + i,
          ).map((n) => (
            <button
              key={n}
              aria-pressed={set.reps === String(n)}
              onClick={() => onChange("reps", String(n))}
            >
              {n}
              <span> reps</span>
            </button>
          ))}
        </div>
      )}
      <p className="quick-memory">
        Changes carry to your remaining sets. Just log when you’re done.
      </p>
      {resting && (
        <div className={"quick-rest " + (seconds === 0 ? "ready" : "")}>
          <Timer size={20} />
          <div>
            <strong>{seconds > 0 ? clock(seconds) : "Ready"}</strong>
            <span>
              {seconds > 0
                ? "Rest · next set is prepared"
                : "Rest complete · go when ready"}
            </span>
          </div>
          {seconds > 0 && (
            <>
              <button onClick={onRestMore}>+15s</button>
              <button onClick={onRestSkip}>Skip</button>
            </>
          )}
        </div>
      )}
      <button
        className="lime-button quick-log"
        disabled={!valid}
        onClick={onLog}
      >
        <Check size={22} />
        <span>
          {valid
            ? `Log ${ex.timed ? `${set.reps}s hold` : `${Number(set.weight) === 0 ? "bodyweight" : `${set.weight} kg`} × ${set.reps}`}`
            : Number(set.reps) <= 0
              ? `Choose ${ex.timed ? "duration" : "reps"} to log`
              : "Choose your weight to log"}
        </span>
        <ArrowRight size={20} />
      </button>
      <div className="quick-footer">
        {canUndo ? (
          <button className="quick-undo" onClick={onUndo}>
            <RotateCcw size={16} /> Undo last set
          </button>
        ) : (
          <span>Saved automatically</span>
        )}
        {otherPending && (
          <button onClick={onLater}>
            Do this later <ArrowRight size={15} />
          </button>
        )}
      </div>
      <details className="quick-cue">
        <summary>
          Form tip{previous?.note ? " & last session’s note" : ""}
        </summary>
        <p>{ex.cue}</p>
        {previous?.note && <p>Last time: {previous.note}</p>}
      </details>
    </section>
  );
}
