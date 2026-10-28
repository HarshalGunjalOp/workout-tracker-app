import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { savedDaySchema } from "@/lib/program";
import { owner, sameOrigin } from "@/lib/server";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await owner();
  if (!user) return NextResponse.json({ error: "Device is not connected." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Cloud is not configured." }, { status: 503 });
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`SELECT payload FROM workout_program_days WHERE owner_hash=${user}`;
    return NextResponse.json(rows.map(row => row.payload), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Program sync is unavailable." }, { status: 503 });
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const user = await owner();
  if (!user) return NextResponse.json({ error: "Device is not connected." }, { status: 401 });
  if (!process.env.DATABASE_URL) return NextResponse.json({ error: "Cloud is not configured." }, { status: 503 });
  const raw = await req.text();
  if (raw.length > 100000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let parsed;
  try { parsed = savedDaySchema.safeParse(JSON.parse(raw)); }
  catch { return NextResponse.json({ error: "Invalid program" }, { status: 400 }); }
  if (!parsed.success) return NextResponse.json({ error: "Invalid program" }, { status: 400 });
  const entry = parsed.data;
  try {
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`INSERT INTO workout_program_days(owner_hash,day_id,updated_at,payload)
      VALUES(${user},${entry.day.id},${entry.updatedAt},${JSON.stringify(entry)}::jsonb)
      ON CONFLICT(owner_hash,day_id) DO UPDATE SET updated_at=EXCLUDED.updated_at,payload=EXCLUDED.payload
      WHERE workout_program_days.updated_at<=EXCLUDED.updated_at RETURNING day_id`;
    return NextResponse.json({ ok: !!rows.length }, { status: rows.length ? 200 : 409 });
  } catch {
    return NextResponse.json({ error: "Program sync is unavailable." }, { status: 503 });
  }
}
