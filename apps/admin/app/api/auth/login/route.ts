import { NextRequest, NextResponse } from "next/server";
import { getExpectedSessionToken, isAuthConfigured, SESSION_COOKIE } from "../../../../lib/session";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { username?: string; password?: string };
  const username = body.username || "";
  const password = body.password || "";

  if (!isAuthConfigured()) {
    return NextResponse.json({ ok: true });
  }

  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, message: "שם משתמש או סיסמה שגויים" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: getExpectedSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 14
  });

  return response;
}
