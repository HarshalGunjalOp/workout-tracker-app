# FORM

A personal, phone-first workout journal for Harshal’s five-day V-taper program. Built with Next.js, React, TypeScript, and Neon Postgres. No sign-up or social features.

## Training

- Upper A on Monday, Lower A on Tuesday, Upper B on Thursday, Lower B on Friday, and Upper C on Saturday. Wednesday and Sunday are rest days.
- Exercise-specific ramp sets appear before the first working set and stay out of workout totals. Unilateral exercises show reps per side.
- Program → open a day → Edit workout to customize names, descriptions, warm-ups, duration, sets, rep/hold ranges, rest, weight increments and coaching notes. Weight increments also apply immediately to the current session. Add, remove or reorder exercises. Saved changes apply to future sessions; existing sessions retain their plan snapshot.
- Unsaved program edits ask before Close, Cancel or Escape discards them; the browser also warns before refresh or leaving the page.
- Program edits save on device, sync across devices per workout, and are included in JSON backups.
- Paired exercises have separate logs. Vacuum holds use seconds.
- Focused next-set logging with a thumb-reachable Log button on phones. Weight/reps start from completed history (or prescribed reps), and changes carry into the remaining unfinished sets of that movement.
- Tap +/- or a rep shortcut instead of typing, with configurable weight increments and a bodyweight shortcut. One-tap undo, automatic next exercise and rest timer, optional sound/haptics, and screen wake lock where supported.
- Previous/Next navigation visits every movement, including completed exercises. Tap any set in the focused logger to correct its weight or reps/duration without changing its completion status or other sets.
- Full set log for individual corrections, exercise/session notes, resumable sessions. “Do this later” keeps unfinished work in the workout; the finish review offers a specific next set or an honest partial save.
- Progression follows the exercise prescription. Uncapped progression uses the first and last sets of the same workout. Double progression uses all prescribed sets. Neck work starts unloaded and gives technique and rep guidance.
- Actual workout history, strongest logged sets, weekly consistency, JSON export/import.
- Device autosave, offline app shell after first load, retrying cloud sync and installable home-screen app.

## Local development

Node.js 22+ is recommended.

```sh
npm ci
cp .env.example .env.local
# Set DATABASE_URL and OWNER_KEY in .env.local.
npm run dev
```

Use a separate Neon development branch for local testing. Production project: `purple-scene-46556222`, database `form`, region Singapore. Migrations are in `schema.sql`. Apply it before running this version: the program editor requires the new `workout_program_days` table as well as `workout_sessions`.

Set `DATABASE_URL` to the pooled Neon URL. Set `OWNER_KEY` to a development-only value ending in `-dev` if you plan to run the API fixture. The server uses it to select the journal's database rows.

Open the same site on each device. FORM syncs any workouts already saved in that browser on startup and retries when the connection returns. Anyone who can access the site can view and edit its journal.

## Validation

```sh
npm run typecheck
npm test
npm run build
# Development API round-trip (with the dev server running):
node tests/api.mjs
```

## Deployment

Vercel project `form-training`, team `team_fNRO2SelBtYX0hC309EtnrIE`. Keep the existing `DATABASE_URL` and `OWNER_KEY` production variables. Changing `OWNER_KEY` selects a different journal. Connect this GitHub repository and use `main` as the production branch; pushes deploy automatically. Preview deployments should use a separate database branch.

## Data conventions & limitations

Log one dumbbell’s weight; unilateral reps are per side. Combined volume is a consistent training-log metric, not a biomechanical total for both limbs. Use 0 kg for bodyweight. Timed core holds do not count toward lifted volume. Summaries count only checked sets. Partial sessions can be saved deliberately.

Changes save to local storage immediately and sync after a short debounce. Offline sets remain available on that browser; export backups before clearing browser storage. Cross-device conflicts use latest edit wins for the whole session; avoid editing the same session on two devices simultaneously. Up to 2,000 cloud sessions are loaded. Timer sounds require interaction and depend on browser background policies. The app’s source is public if the GitHub repository is public; private journal data and credentials are never included in source.
