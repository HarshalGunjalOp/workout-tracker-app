"use client";

import { Check, Flag, Flame, Sparkles, Trophy } from "lucide-react";
import type { Session } from "@/lib/training";
import type { Day } from "@/lib/plan";
import { movementsFor } from "@/lib/training";
import { planProgress, type SetReward } from "@/lib/motivation";

export function SetCelebration({ reward }: { reward: SetReward | null }) {
  const big = reward && (reward.achievement.records.length > 0 || !!reward.achievement.weeklyWin || reward.exerciseComplete || reward.allDone);
  return (
    <div role="status" aria-live="polite" aria-atomic="true">
      {reward && (
        <section key={reward.key} className={`set-reward ${big ? "set-reward-big" : ""} ${reward.achievement.records.length ? "set-reward-pr" : ""}`}>
          <div className="reward-heading">
            <span className="reward-icon" aria-hidden="true">
              {reward.achievement.records.length ? <Trophy size={22} /> : reward.achievement.weeklyWin ? <Flame size={22} /> : reward.exerciseComplete ? <Flag size={22} /> : <Check size={22} />}
            </span>
            <div>
              <span className="reward-kicker">{reward.achievement.records.length ? "ALL-TIME BEST" : reward.achievement.weeklyWin ? "WEEK-OVER-WEEK WIN" : reward.exerciseComplete ? "MOVEMENT IN THE BANK" : "SET IN THE BANK"}</span>
              <h3>{reward.title}</h3>
            </div>
            {big && <Sparkles className="reward-sparkle" size={24} aria-hidden="true" />}
          </div>
          <div className="reward-performance">{reward.exercise} <span>· Set {reward.si + 1} · {reward.performance}</span></div>
          {reward.achievement.records.length > 0 && <div className="reward-badges">{reward.achievement.records.map((record) => <span key={record}><Trophy size={13} />{record}</span>)}</div>}
          {reward.achievement.weeklyWin && <p className="reward-weekly"><Flame size={15} />{reward.achievement.weeklyWin}</p>}
          {reward.achievement.baseline && <small className="reward-baseline">Compared with the same set’s best completed performance last week.</small>}
          <p className="reward-message">{reward.message}</p>
          {reward.exerciseComplete && (reward.achievement.records.length > 0 || reward.achievement.weeklyWin) && <div className="reward-exercise"><Check size={15} />All planned sets for this exercise, complete.</div>}
        </section>
      )}
    </div>
  );
}

export function WorkoutMission({ session, day, focusMi, prs, weeklyWins, onSelect }: {
  session: Session; day: Day; focusMi: number; prs: number; weeklyWins: number; onSelect: (id: string) => void;
}) {
  const p = planProgress(session, day);
  const remaining = p.total - p.done;
  return (
    <section className="workout-mission" aria-label="Your workout mission">
      <div className="mission-topline">
        <span><Flame size={15} />{p.complete ? "MISSION COMPLETE" : "ONE SET AT A TIME"}</span>
        <strong>{Math.round(p.done / p.total * 100)}%</strong>
      </div>
      <div className="mission-copy"><strong>{p.complete ? "You brought it home." : p.done === 0 ? "Start with one. Build from there." : remaining === 1 ? "One last planned set. You’re right here." : p.done >= p.total * 0.75 ? "The finish is in sight." : `${p.done} sets banked. Keep building.`}</strong><span>{p.done}/{p.total} planned sets · {p.exercises}/{p.exerciseTotal} movements</span></div>
      <div className="mission-bar" role="progressbar" aria-label="Planned sets completed" aria-valuenow={p.done} aria-valuemin={0} aria-valuemax={p.total}><i style={{ width: `${p.done / p.total * 100}%` }} /></div>
      <div className="mission-route" aria-label="Exercise progress">
        {session.movements.map((m, mi) => {
          const ex = day.exercises.find((ex) => movementsFor(ex).some((x) => x.id === m.exerciseId));
          const complete = !!ex && m.sets.slice(0, ex.sets).filter((s) => s.done).length === ex.sets;
          return <button key={m.exerciseId} className={complete ? "done" : mi === focusMi ? "current" : ""} aria-label={`${m.name}: ${complete ? "planned sets complete" : `${m.sets.filter((s) => s.done).length} sets logged`}`} aria-current={mi === focusMi ? "step" : undefined} onClick={() => onSelect(m.exerciseId)}><span>{complete ? <Check size={15} /> : mi + 1}</span><i /></button>;
        })}
      </div>
      <div className="mission-wins"><span><Trophy size={14} />{prs} PR set{prs === 1 ? "" : "s"}</span><span><Flame size={14} />{weeklyWins} last-week win{weeklyWins === 1 ? "" : "s"}</span>{p.extras > 0 && <span>+{p.extras} extra sets</span>}<span>{p.targets} rep / hold targets met</span></div>
    </section>
  );
}
