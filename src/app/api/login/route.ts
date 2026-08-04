import { NextRequest, NextResponse } from "next/server";
import { createSessionToken, passwordsMatch } from "@/lib/auth";

export const dynamic = "force-dynamic";

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function clientId(req: NextRequest): string {
  const forwarded =
    req.headers.get("x-vercel-forwarded-for") ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0];
  return (forwarded?.trim() || "local").slice(0, 128);
}

function cleanExpiredAttempts(now: number): void {
  if (attempts.size < 500) return;
  for (const [key, value] of attempts) {
    if (value.resetAt <= now) attempts.delete(key);
  }
}

// POST /api/login -> đăng nhập bằng APP_PASSWORD, set cookie
export async function POST(req: NextRequest) {
  let password: unknown;
  try {
    ({ password } = (await req.json()) as { password?: unknown });
  } catch {
    return NextResponse.json({ error: "Dữ liệu đăng nhập không hợp lệ" }, { status: 400 });
  }
  const expected = process.env.APP_PASSWORD;
  const id = clientId(req);
  const now = Date.now();
  cleanExpiredAttempts(now);
  const current = attempts.get(id);

  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return NextResponse.json(
      { error: "Đăng nhập sai quá nhiều lần. Vui lòng thử lại sau." },
      { status: 429, headers: { "Retry-After": String(Math.ceil((current.resetAt - now) / 1000)) } }
    );
  }

  if (!expected) {
    return NextResponse.json(
      { error: "Chưa đặt APP_PASSWORD trong .env.local" },
      { status: 500 }
    );
  }
  if (typeof password !== "string" || password.length > 1024 || !(await passwordsMatch(password, expected))) {
    const next = !current || current.resetAt <= now
      ? { count: 1, resetAt: now + WINDOW_MS }
      : { ...current, count: current.count + 1 };
    attempts.set(id, next);
    return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
  }

  attempts.delete(id);
  const maxAge = 60 * 60 * 24 * 7;
  const res = NextResponse.json({ ok: true });
  res.cookies.set("vc_auth", await createSessionToken(maxAge), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  return res;
}

// DELETE /api/login -> đăng xuất
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("vc_auth", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return res;
}
