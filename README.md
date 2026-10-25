# FORM

A personal, phone-first workout journal for Harshal’s five-day V-taper program. Built with Next.js, React, TypeScript, and Neon Postgres. No sign-up or social features.

## Training

- All five prescribed training days, every exercise, rep range, rest interval and form cue.
- Paired exercises have separate logs. Vacuum holds use seconds.
- One-tap set completion, automatic rest timer, optional sound/haptics, screen wake lock where supported.
- Previous set numbers, copy-first-set shortcuts, exercise/session notes, resumable sessions.
- Double progression prompts after all prescribed sets reach the top range at the same weight.
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

Use a separate Neon development branch for local testing. Production project: `purple-scene-46556222`, database `form`, region Singapore. Migrations are in `schema.sql`.

Set `DATABASE_URL` to the pooled Neon URL. Generate `OWNER_KEY` with a cryptographically secure 32-byte random generator. Never commit either value.

Open `https://your-domain/#key=YOUR_OWNER_KEY` once on each device. The app exchanges the link for a secure HttpOnly cookie and removes the fragment. Preferences can copy the private link for another device. Treat this link like access to your journal. It is intentionally the only device setup; there is no account or sign-in page. Without it, the cloud API rejects access; device-local logging remains available. Development without OWNER_KEY uses an isolated development owner identity.

## Validation

```sh
npm run typecheck
npm test
npm run build
# Development API round-trip (with the dev server running):
node tests/api.mjs
```

## Deployment

Vercel project `form-training`, team `team_fNRO2SelBtYX0hC309EtnrIE`. Set `DATABASE_URL` and `OWNER_KEY` as encrypted server-only production variables. Connect this GitHub repository and use `main` as the production branch; pushes deploy automatically. Preview deployments should use a separate database branch.

## Data conventions & limitations

Log one dumbbell’s weight; unilateral reps are per side. Combined volume is a consistent training-log metric, not a biomechanical total for both limbs. Use 0 kg for bodyweight. Timed core holds do not count toward lifted volume. Summaries count only checked sets. Partial sessions can be saved deliberately.

Changes save to local storage immediately and sync after a short debounce. Offline sets remain available on that browser; export backups before clearing browser storage. Cross-device conflicts use latest edit wins for the whole session; avoid editing the same session on two devices simultaneously. Up to 2,000 cloud sessions are loaded. Timer sounds require interaction and depend on browser background policies. The app’s source is public if the GitHub repository is public; private journal data and credentials are never included in source.
