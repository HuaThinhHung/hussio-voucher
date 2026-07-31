import { NextRequest, NextResponse } from "next/server";

// Bảo vệ toàn bộ app bằng 1 mật khẩu (tool nội bộ).
// Cho qua: trang /login, API /api/login, và tài nguyên tĩnh của Next.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/login") ||
    pathname.startsWith("/_next") ||
    // Cho qua asset tĩnh trong /public (logo, favicon, ảnh…) — không cần đăng nhập
    /\.(png|jpe?g|svg|gif|webp|ico|txt|woff2?|ttf)$/i.test(pathname);

  if (isPublic) return NextResponse.next();

  const cookie = req.cookies.get("vc_auth")?.value;
  const expected = process.env.APP_PASSWORD;

  if (!expected || cookie !== expected) {
    // API -> trả 401; trang -> chuyển tới /login
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
