"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCheck,
  Minus,
  Plus,
  RotateCcw,
  Timer,
} from "lucide-react";
import { readWeightSteps } from "@/lib/weight-steps";
import type { Exercise } from "@/lib/plan";
import {
  supersetPartner,
  type MovementLog,
  type Session,
} from "@/lib/training";

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
          style={value.length > 4 ? { fontSize: `${Math.max(12, 32 - value.length * 2)}px` } : undefined}
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
  feedback,
  mi,
  ex,
  previous,
  seconds,
  resting,
  canUndo,
  onChange,
  onLog,
  onUndo,
  onNavigate,
  onEdit,
  weightIncrement,
  onRestMore,
  onRestSkip,
  onReview,
}: {
  feedback?: { id: number; name: string; complete: boolean; count: number } | null;
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
  onNavigate: (offset: number) => void;
  onEdit: (si: number, weight: string, reps: string) => void;
  weightIncrement?: number;
  onRestMore: () => void;
  onRestSkip: () => void;
  onReview: () => void;
}) {
  const [weightSteps, setWeightSteps] = useState<Record<string, number>>({});
  const [editing, setEditing] = useState<number | null>(null);
  useEffect(() => { setWeightSteps(readWeightSteps()); }, []);
  const exerciseId = session.movements[mi]?.exerciseId;
  const weightStep = weightIncrement ?? ex?.weightStep ?? (exerciseId ? weightSteps[exerciseId] : undefined) ?? 2.5;
  const m = session.movements[mi];
  const si = m?.sets.findIndex((s) => !s.done) ?? -1;
  const set = m?.sets[si];
  const allDone = session.movements.every((movement) =>
    movement.sets.every((s) => s.done),
  );
  if (!m || !ex) return null;
  const navigation = (
    <nav className="exercise-navigation" aria-label="Exercise navigation">
      <button disabled={mi === 0} onClick={() => onNavigate(-1)}><ArrowLeft size={18} /> Previous</button>
      <span>{mi + 1} / {session.movements.length}</span>
      <button disabled={mi === session.movements.length - 1} onClick={() => onNavigate(1)}>Next <ArrowRight size={18} /></button>
    </nav>
  );
  const setPicker = (
    <div className="set-picker" role="group" aria-label="Sets — tap to edit">
      {m.sets.map((s, i) => <button key={i} className={s.done ? "done" : i === si ? "current" : ""} aria-label={`Edit ${m.name} set ${i + 1}${s.done ? ", logged" : ""}`} aria-pressed={editing === i} onClick={() => setEditing(i)}>
        <strong>{s.done && <Check size={14} />} Set {i + 1}</strong>
        <span>{ex.timed ? `${s.reps}s` : `${s.weight === "" ? "—" : s.weight + " kg"} × ${s.reps}`}</span>
      </button>)}
    </div>
  );
  if (editing !== null) return (
    <section className="quick-logger" aria-label="Edit set">
      {navigation}<h2>{m.name}</h2>{setPicker}
      <InlineSetEditor key={editing} set={m.sets[editing]} si={editing} timed={!!ex.timed} onCancel={() => setEditing(null)} onSave={(weight, reps) => { onEdit(editing, weight, reps); setEditing(null); }} />
    </section>
  );
  if (!set) return (
    <section className="quick-logger quick-complete" aria-label={allDone ? "Workout complete" : "Exercise complete"}>
      {navigation}<CheckCheck size={36} /><h2>{m.name}</h2>
      <p>{allDone ? "Every set, done. Your workout is ready to save." : "Exercise complete. Tap a set to correct it, or move to another exercise."}</p>
      {setPicker}
      {allDone && <div className="set-action-dock"><button className="lime-button quick-log" onClick={onReview}>Save workout <CheckCheck size={20} /></button></div>}
      {canUndo && <button className="quick-undo" onClick={onUndo}><RotateCcw size={16} /> Undo last set</button>}
    </section>
  );
  const partner = supersetPartner(session, ex, mi);
  const partnerNext = partner?.sets[si] && !partner.sets[si].done;
  const last = previous?.sets[si]?.done
    ? previous.sets[si]
    : previous?.sets.filter((s) => s.done).at(-1);
  const valid =
    Number(set.reps) > 0 &&
    (ex.timed || (set.weight !== "" && Number.isFinite(Number(set.weight))));
  const restingNow = resting && seconds > 0;
  return (
    <section className={"quick-logger " + (restingNow ? "is-resting " : "") + (feedback ? "quick-logger-earned" : "")} aria-label="Next set">
      {navigation}
      <div className="quick-overline">
        <span>
          {resting && seconds > 0 ? "RESTING · NEXT UP" : "YOUR NEXT SET"}
        </span>
        <span>
          EXERCISE {mi + 1} / {session.movements.length}
        </span>
      </div>
      {resting && (
      <div className={"rest-stage " + (restingNow ? "running" : "")} aria-label="Rest timer">
        <div className="rest-stage-heading"><Timer size={16} /><span>{restingNow ? "RECOVER" : "READY WHEN YOU ARE"}</span></div>
        <strong className="rest-stage-clock" role="timer" aria-label={restingNow ? `${seconds} seconds remaining` : "Rest complete"}>{restingNow ? clock(seconds) : "Ready"}</strong>
        <p>Next: {ex.timed ? `${set.reps}s hold` : `${set.weight === "" ? "Choose weight" : Number(set.weight) === 0 ? "Bodyweight" : `${set.weight} kg`} × ${set.reps}`}</p>
        <div className="rest-stage-controls">
          <button onClick={onRestMore}>+15s</button>
          <button onClick={onRestSkip}>End rest</button>
        </div>
      </div>
      )}
      {partner && (
        <div className="superset-guide">
          <strong>
            SUPERSET · ROUND {si + 1} OF {m.sets.length}
          </strong>
          <p>{ex.name.split(" + ").join(" → ")}</p>
          <span>Alternate one set of each. Rest {ex.rest}s after both.</span>
        </div>
      )}
      <h2 key={m.exerciseId} className="next-exercise-title" aria-live="polite">{m.name}</h2>
      {partner && (
        <p className="superset-next">
          {partnerNext
            ? `Then ${partner.name} · no rest between movements`
            : `Then rest ${ex.rest}s${si + 1 < m.sets.length ? " · next round follows automatically" : " · superset complete"}`}
        </p>
      )}
      <div className="focused-set-progress">
      {setPicker}
      <p className="set-edit-hint">Tap any set to edit its weight or {ex.timed ? "duration" : "reps"}.</p>
      <div className="exercise-win-slot" aria-live="polite" aria-atomic="true">
        {feedback?.complete ? (
          <div key={feedback.id} className="exercise-win">
            <div className="exercise-win-marks" aria-hidden="true">
              {Array.from({ length: feedback.count }, (_, i) => <span key={i} style={{ "--mark": i } as React.CSSProperties}><Check size={14} /></span>)}
              <i><CheckCheck size={24} /></i>
            </div>
            <div><strong>Exercise complete</strong><span>{feedback.name}</span></div>
          </div>
        ) : <span className="sr-only">{feedback ? "Set saved. Next set ready." : ""}</span>}
      </div>
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
          <span className="weight-step-label">+/− {weightStep} kg · change in Program → Edit workout</span>
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
      <div className="set-action-dock">
      <button
        className="lime-button quick-log"
        disabled={!valid}
        onClick={onLog}
      >
        <span>
          {valid
            ? `Log ${ex.timed ? `${set.reps}s hold` : `${Number(set.weight) === 0 ? "bodyweight" : `${set.weight} kg`} × ${set.reps}`}`
            : Number(set.reps) <= 0
              ? `Choose ${ex.timed ? "duration" : "reps"} to log`
              : "Choose your weight to log"}
        </span>
      </button>
      <div className="quick-footer">
        {canUndo ? (
          <button className="quick-undo" onClick={onUndo}>
            <RotateCcw size={16} /> Undo last set
          </button>
        ) : (
          <span>Saved automatically</span>
        )}
      </div>
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

function InlineSetEditor({ set, si, timed, onSave, onCancel }: {
  set: { weight: string; reps: string; done: boolean }; si: number; timed: boolean;
  onSave: (weight: string, reps: string) => void; onCancel: () => void;
}) {
  const [weight, setWeight] = useState(set.weight);
  const [reps, setReps] = useState(set.reps);
  const valid = /^\d+$/.test(reps) && reps.length <= 5 && Number(reps) > 0 &&
    (timed || (weight !== "" && /^\d*(\.\d*)?$/.test(weight) && weight.length <= 8 && Number.isFinite(Number(weight))));
  return <form className="inline-set-editor" onSubmit={e => { e.preventDefault(); if (valid) onSave(weight, reps); }}>
    <h3>Edit set {si + 1}</h3>
    <p>Changes apply only to this set. {set.done ? "It stays logged." : "It stays unlogged."}</p>
    {!timed && <label>Weight (kg)<input autoFocus inputMode="decimal" value={weight} maxLength={8} onFocus={e => e.target.select()} onChange={e => setWeight(e.target.value)} /></label>}
    <label>{timed ? "Duration (seconds)" : "Reps"}<input autoFocus={timed} inputMode="numeric" value={reps} maxLength={5} onFocus={e => e.target.select()} onChange={e => setReps(e.target.value)} /></label>
    <div className="inline-edit-actions"><button type="button" className="outline-button" onClick={onCancel}>Cancel</button><button className="lime-button" disabled={!valid}>Save set</button></div>
  </form>;
}
