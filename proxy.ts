import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sessionCookieName, verifySession } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith("/api/auth/");
  const isLoginPage = pathname === "/login";
  const session = await verifySession(request.cookies.get(sessionCookieName)?.value);

  if (isAuthRoute) return NextResponse.next();
  if (isLoginPage) return session ? NextResponse.redirect(new URL("/", request.url)) : NextResponse.next();
  if (session) return NextResponse.next();
  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "请先登录沐尘" }, { status: 401 });

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
