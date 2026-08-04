import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

// Bảo vệ toàn bộ app bằng session đã ký.
// Cho qua: trang /login, API /api/login, và tài nguyên tĩnh của Next.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    /\.(png|jpe?g|svg|gif|webp|ico|txt|woff2?|ttf)$/i.test(pathname);

  if (isPublic) return NextResponse.next();

  const cookie = req.cookies.get("vc_auth")?.value;
  const configured = Boolean(process.env.APP_SESSION_SECRET || process.env.APP_PASSWORD);

  if (!configured || !(await verifySessionToken(cookie))) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
