import { Activity, ArrowUpRight, Dumbbell, Layers, Trophy } from "lucide-react";
import { PLAN, type Day } from "@/lib/plan";
import {
  canProgress,
  completedSets,
  localDate,
  movementsFor,
  previousMovement,
  volume,
  type Session,
} from "@/lib/training";
import styles from "./progress-dashboard.module.css";

const number = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 1 }).format(n);
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Kolkata",
  });

export function ProgressDashboard({ history, plan = PLAN }: { history: Session[]; plan?: Day[] }) {
  const ordered = [...history].sort((a, b) =>
    a.startedAt.localeCompare(b.startedAt),
  );
  const recent = ordered.slice(-8);
  const maximum = Math.max(1, ...recent.map(volume));
  const days = Array.from({ length: 35 }, (_, i) => {
    const day = new Date();
    day.setDate(day.getDate() - (34 - i));
    const key = localDate(day.toISOString());
    const count = history.filter((s) => localDate(s.startedAt) === key).length;
    return { key, count, label: shortDate(day.toISOString()) };
  });
  const activeDays = days.filter((d) => d.count > 0).length;
  const milestones = plan.flatMap((day) =>
    day.exercises.flatMap((ex) => {
      if (ex.timed) return [];
      return movementsFor(ex).flatMap((movement) => {
        const previous = previousMovement(history, movement.id);
        const sets = history.flatMap((s) =>
          s.movements
            .filter((m) => m.exerciseId === movement.id)
            .flatMap((m) => m.sets.filter((s) => s.done)),
        );
        const best = [...sets].sort(
          (a, b) =>
            Number(b.weight) - Number(a.weight) ||
            Number(b.reps) - Number(a.reps),
        )[0];
        if (!best || !previous) return [];
        const ready = canProgress(previous, ex);
        const completed = previous.sets.filter((s) => s.done);
        const achieved = completed
          .slice(0, ex.sets)
          .reduce(
            (total, s) =>
              total + Math.min(ex.max, Math.max(0, Number(s.reps) || 0)),
            0,
          );
        return [
          {
            id: movement.id,
            name: movement.name,
            muscle: ex.muscle,
            best,
            ready,
            achieved,
            target: ex.max * ex.sets,
          },
        ];
      });
    }),
  );
  const readyCount = milestones.filter((m) => m.ready).length;
  return (
    <div className={styles.dashboard}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>YOUR TRAINING, IN FOCUS</span>
          <h1>
            See the work.
            <br />
            <em>Feel the progress.</em>
          </h1>
          <p>Every session leaves a mark. Here’s yours.</p>
          <span className={styles.heroBadge}>
            <Activity size={14} /> {activeDays} active{" "}
            {activeDays === 1 ? "day" : "days"} in the last 35 days
          </span>
        </div>
        <div className={styles.activity}>
          <div className={styles.panelTop}>
            <span>CONSISTENCY MAP</span>
            <span>35 DAYS</span>
          </div>
          <div className={styles.heatmap}>
            {days.map((d) => (
              <div
                key={d.key}
                className={d.count ? styles.activeDay : styles.restDay}
                title={`${d.label}: ${d.count} sessions`}
                aria-label={`${d.label}: ${d.count} sessions`}
              />
            ))}
          </div>
          <div className={styles.mapLegend}>
            <span>Show up. Build momentum.</span>
            <span>
              <i /> Rest <i className={styles.legendActive} /> Trained
            </span>
          </div>
        </div>
      </header>
      <div className={styles.stats}>
        {[
          {
            label: "SESSIONS",
            value: number(history.length),
            unit: "workouts completed",
            icon: Dumbbell,
          },
          {
            label: "WORKING SETS",
            value: number(history.reduce((n, s) => n + completedSets(s), 0)),
            unit: "sets in the bank",
            icon: Layers,
          },
          {
            label: "TOTAL VOLUME",
            value: number(history.reduce((n, s) => n + volume(s), 0)),
            unit: "kg lifted · logged load",
            icon: Activity,
          },
        ].map(({ label, value, unit, icon: Icon }) => (
          <div className={styles.stat} key={label}>
            <div>
              <span>{label}</span>
              <Icon size={18} />
            </div>
            <strong>{value}</strong>
            <small>{unit}</small>
          </div>
        ))}
      </div>
      <section className={styles.chartPanel}>
        <div className={styles.sectionTitle}>
          <div>
            <span className={styles.kicker}>SESSION BY SESSION</span>
            <h2>Your lifting rhythm</h2>
          </div>
          <span className={styles.pill}>Last {recent.length} sessions</span>
        </div>
        {recent.length ? (
          <>
            <div className={styles.chart}>
              {recent.map((session, i) => (
                <div className={styles.barColumn} key={session.id}>
                  <span>{number(volume(session))}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={
                        i === recent.length - 1 ? styles.latestBar : styles.bar
                      }
                      style={{
                        height: `${(volume(session) / maximum) * 100}%`,
                      }}
                    />
                  </div>
                  <small>{shortDate(session.startedAt)}</small>
                </div>
              ))}
            </div>
            <p className={styles.chartNote}>
              Volume in kg per session. Different workouts can have different
              volumes.
            </p>
          </>
        ) : (
          <div className={styles.empty}>
            <Activity size={32} />
            <h3>Your first session starts the story.</h3>
            <p>
              Finish a workout to reveal your volume chart and exercise
              milestones.
            </p>
          </div>
        )}
      </section>
      {milestones.length > 0 && (
        <section>
          <div className={styles.sectionTitle}>
            <div>
              <span className={styles.kicker}>STRENGTH SNAPSHOT</span>
              <h2>Your next milestones</h2>
            </div>
            {readyCount > 0 && (
              <span className={styles.pill}>
                {readyCount} ready to progress <ArrowUpRight size={14} />
              </span>
            )}
          </div>
          <div className={styles.milestones}>
            {milestones.map((m) => (
              <article className={styles.milestone} key={m.id}>
                <div className={styles.muscle}>
                  <span>{m.muscle}</span>
                  <Trophy size={16} />
                </div>
                <h3>{m.name}</h3>
                <span className={styles.bestLabel}>BEST LOGGED SET</span>
                <div className={styles.best}>
                  {Number(m.best.weight) > 0 ? (
                    <>
                      {m.best.weight}
                      <small>kg</small>
                    </>
                  ) : (
                    <>BW</>
                  )}
                  <span>×</span>
                  {m.best.reps}
                  <small>reps</small>
                </div>
                <div
                  className={styles.repTrack}
                  role="meter"
                  aria-label={`${m.name}: reps toward target in latest session`}
                  aria-valuemin={0}
                  aria-valuemax={m.target}
                  aria-valuenow={Math.min(m.target, m.achieved)}
                >
                  <div
                    style={{
                      width: `${Math.min(100, (m.achieved / m.target) * 100)}%`,
                    }}
                  />
                </div>
                <div className={styles.target}>
                  <span>Latest session rep target</span>
                  <strong>
                    {m.achieved}/{m.target}
                  </strong>
                </div>
                <p className={m.ready ? styles.ready : styles.building}>
                  {m.ready ? (
                    <>
                      <ArrowUpRight size={15} />
                      Ready for more weight
                    </>
                  ) : (
                    <>Keep building toward your rep target</>
                  )}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
