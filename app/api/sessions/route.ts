import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { sessionSchema } from "@/lib/schema";
import { owner, sameOrigin } from "@/lib/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await owner();
  if (!user)
    return NextResponse.json(
      { error: "Open your personal device link to connect." },
      { status: 401 },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Cloud storage is not configured." },
      { status: 503 },
    );
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows =
      await sql`SELECT payload FROM workout_sessions WHERE owner_hash=${user} ORDER BY started_at DESC LIMIT 2000`;
    return NextResponse.json(
      rows.map((r) => r.payload),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Cloud is unavailable. Your device copy is safe." },
      { status: 503 },
    );
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await owner();
  if (!user)
    return NextResponse.json(
      { error: "Device is not connected." },
      { status: 401 },
    );
  if (!process.env.DATABASE_URL)
    return NextResponse.json(
      { error: "Cloud storage is not configured." },
      { status: 503 },
    );
  if (Number(req.headers.get("content-length") || 0) > 100000)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  try {
    const raw = await req.text();
    if (raw.length > 100000)
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    const result = sessionSchema.safeParse(JSON.parse(raw));
    if (!result.success)
      return NextResponse.json(
        { error: "Invalid workout data" },
        { status: 400 },
      );
    const s = result.data;
    const sql = neon(process.env.DATABASE_URL);
    const rows =
      await sql`INSERT INTO workout_sessions(id,day_id,started_at,finished_at,updated_at,payload,owner_hash) VALUES(${s.id},${s.dayId},${s.startedAt},${s.finishedAt},${s.updatedAt},${JSON.stringify(s)}::jsonb,${user}) ON CONFLICT(id) DO UPDATE SET finished_at=EXCLUDED.finished_at,updated_at=EXCLUDED.updated_at,payload=EXCLUDED.payload WHERE workout_sessions.owner_hash=${user} AND workout_sessions.updated_at<=EXCLUDED.updated_at RETURNING id`;
    if (!rows.length)
      return NextResponse.json(
        { error: "A newer copy exists. Refresh to merge your devices." },
        { status: 409 },
      );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Could not sync. Your workout is saved on this device." },
      { status: 503 },
    );
  }
}
