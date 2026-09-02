import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionCookieName, verifySession } from "@/lib/auth";
import { supportCookieName, verifySupportSession } from "@/lib/support-auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/api/auth/");
  const isSupportAuthRoute = pathname.startsWith("/api/support/auth/");
  const isSupportApiRoute = pathname.startsWith("/api/support/");
  const isSupportPath = pathname === "/support" || pathname.startsWith("/support/");
  const isSupportLogin = pathname === "/support/login";
  const isLoginPage = pathname === "/login";
  const isLocalPreviewBypass = process.env.NODE_ENV !== "production"
    && process.env.MUCHEN_LOCAL_PREVIEW_BYPASS === "true"
    && ["localhost", "127.0.0.1"].includes(request.nextUrl.hostname);
  const session = await verifySession(request.cookies.get(sessionCookieName)?.value);
  const supportSession = await verifySupportSession(request.cookies.get(supportCookieName)?.value);

  if (isAuthRoute || isSupportAuthRoute) return NextResponse.next();
  if (isSupportPath || isSupportApiRoute) {
    if (isSupportLogin) return supportSession ? NextResponse.redirect(new URL("/support", request.url)) : NextResponse.next();
    if (supportSession) return NextResponse.next();
    if (pathname.startsWith("/api/")) return NextResponse.json({ error: "请先登录客服工作台" }, { status: 401 });
    return NextResponse.redirect(new URL("/support/login", request.url));
  }
  if (isLoginPage) return session || isLocalPreviewBypass ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  if (session || isLocalPreviewBypass) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "请先登录沐尘" }, { status: 401 });

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
