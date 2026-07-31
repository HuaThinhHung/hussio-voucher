import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// POST /api/login -> đăng nhập bằng APP_PASSWORD, set cookie
export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };
  const expected = process.env.APP_PASSWORD;

  if (!expected) {
    return NextResponse.json(
      { error: "Chưa đặt APP_PASSWORD trong .env.local" },
      { status: 500 }
    );
  }
  if (!password || password !== expected) {
    return NextResponse.json({ error: "Sai mật khẩu" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("vc_auth", expected, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 ngày
  });
  return res;
}

// DELETE /api/login -> đăng xuất
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("vc_auth", "", { path: "/", maxAge: 0 });
  return res;
}
