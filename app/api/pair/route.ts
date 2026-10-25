import { NextResponse } from "next/server";
import { hash, safeEqual, sameOrigin } from "@/lib/server";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const { key } = await req.json();
    if (
      typeof key !== "string" ||
      !process.env.OWNER_KEY ||
      !safeEqual(key, process.env.OWNER_KEY)
    )
      return NextResponse.json(
        { error: "This device link is not valid." },
        { status: 403 },
      );
    const res = NextResponse.json({ ok: true });
    res.cookies.set("form-device", hash(key), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
