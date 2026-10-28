"use client";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { type Day, type Exercise } from "@/lib/plan";
import { programDaySchema } from "@/lib/program";

export function ProgramEditor({ day, onSave, onClose }: {
  day: Day; onSave: (day: Day) => void; onClose: () => void;
}) {
  const [draft, setDraft] = useState<Day>(() => structuredClone(day));
  const [error, setError] = useState("");
  function exercise(id: string, patch: Partial<Exercise>) {
    setDraft(old => ({ ...old, exercises: old.exercises.map(ex => ex.id === id ? { ...ex, ...patch } : ex) }));
  }
  function move(index: number, offset: number) {
    setDraft(old => {
      const exercises = [...old.exercises];
      [exercises[index], exercises[index + offset]] = [exercises[index + offset], exercises[index]];
      return { ...old, exercises };
    });
  }
  return <div className="modal-backdrop">
    <section className="modal program-editor" role="dialog" aria-modal="true" aria-labelledby="program-editor-title">
      <button className="modal-close icon-button" aria-label="Close program editor" onClick={onClose}><X size={21} /></button>
      <div className="eyebrow">MAKE IT YOURS · {day.day.toUpperCase()}</div>
      <h2 id="program-editor-title">Edit workout<span>.</span></h2>
      <p>Changes apply to future workouts. Your current session and history stay as logged.</p>
      <form onSubmit={event => {
        event.preventDefault();
        const result = programDaySchema.safeParse(draft);
        if (!result.success) {
          setError(result.error.issues.map(issue => `${issue.path.join(" → ")}: ${issue.message}`).join(" "));
          return;
        }
        setError(""); onSave(result.data);
      }}>
        <div className="program-fields">
          <label>Workout name<input required maxLength={150} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
          <label>Description<input maxLength={200} value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} /></label>
          <label>Focus / muscles<input maxLength={300} value={draft.focus} onChange={e => setDraft({ ...draft, focus: e.target.value })} /></label>
          <label>Estimated minutes<input required type="number" min={1} max={300} value={draft.minutes || ""} onChange={e => setDraft({ ...draft, minutes: Number(e.target.value) })} /></label>
          <label className="program-wide">Warm-up<textarea maxLength={2000} value={draft.warmup} onChange={e => setDraft({ ...draft, warmup: e.target.value })} /></label>
        </div>
        <h3>Exercises</h3>
        {draft.exercises.map((ex, index) => <fieldset className="program-edit-exercise" key={ex.id}>
          <legend>Exercise {index + 1}{ex.superset ? " · Superset" : ""}</legend>
          <div className="program-exercise-actions">
            <button type="button" className="icon-button" aria-label={`Move exercise ${index + 1} up`} disabled={index === 0} onClick={() => move(index, -1)}><ArrowUp size={18} /></button>
            <button type="button" className="icon-button" aria-label={`Move exercise ${index + 1} down`} disabled={index === draft.exercises.length - 1} onClick={() => move(index, 1)}><ArrowDown size={18} /></button>
            <button type="button" className="icon-button" aria-label={`Remove exercise ${index + 1}`} disabled={draft.exercises.length === 1} onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter(item => item.id !== ex.id) })}><Trash2 size={18} /></button>
          </div>
          <div className="program-fields">
            <label className="program-wide">Exercise name<input required maxLength={150} value={ex.name} onChange={e => exercise(ex.id, { name: e.target.value })} />{ex.superset && <small>Use “First movement + Second movement”. Each is logged separately.</small>}</label>
            <label className="program-wide">Muscles<input maxLength={200} value={ex.muscle} onChange={e => exercise(ex.id, { muscle: e.target.value })} /></label>
            <label>Sets<input required type="number" min={1} max={20} value={ex.sets || ""} onChange={e => exercise(ex.id, { sets: Number(e.target.value) })} /></label>
            <label>Rest (seconds)<input required type="number" min={0} max={1800} value={ex.rest} onChange={e => exercise(ex.id, { rest: Number(e.target.value) })} /></label>
            <label>Minimum {ex.timed ? "seconds" : "reps"}<input required type="number" min={1} max={99999} value={ex.min || ""} onChange={e => exercise(ex.id, { min: Number(e.target.value) })} /></label>
            <label>Maximum {ex.timed ? "seconds" : "reps"}<input required type="number" min={ex.min || 1} max={99999} value={ex.max || ""} onChange={e => exercise(ex.id, { max: Number(e.target.value) })} /></label>
            <label className="program-wide">Description / coaching notes<textarea maxLength={2000} value={ex.cue} onChange={e => exercise(ex.id, { cue: e.target.value })} /></label>
          </div>
          {!ex.superset && <label className="program-unit">Measure targets in<select value={ex.timed ? "seconds" : "reps"} onChange={event => exercise(ex.id, { timed: event.target.value === "seconds" })}><option value="reps">Reps</option><option value="seconds">Seconds (timed hold)</option></select></label>}
        </fieldset>)}
        <button type="button" className="outline-button" disabled={draft.exercises.reduce((n, ex) => n + (ex.superset ? 2 : 1), 0) >= 30} onClick={() => setDraft({ ...draft, exercises: [...draft.exercises, {
          id: `custom-${crypto.randomUUID()}`, name: "New exercise", muscle: "", sets: 3, min: 8, max: 12, rest: 60, cue: "",
        }] })}><Plus size={17} /> Add exercise</button>
        {error && <p className="program-error" role="alert">{error}</p>}
        <div className="program-editor-footer">
          <button type="button" className="outline-button" onClick={onClose}>Cancel</button>
          <button type="submit" className="lime-button">Save workout</button>
        </div>
      </form>
    </section>
  </div>;
}
