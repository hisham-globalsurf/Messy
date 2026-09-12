import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

const PUBLIC_API = [
  "/api/auth/login",
  // Member-facing routes authenticate via their own separate session cookie
  // (see src/lib/memberApi.ts), not the admin cookie this proxy checks.
  "/api/member",
];

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySession(token) : null;

  const isApi = pathname.startsWith("/api");
  const isPublicApi = PUBLIC_API.some((p) => pathname.startsWith(p));

  if (isApi) {
    if (isPublicApi || session) return NextResponse.next();
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Page routes.
  if (pathname === "/login") {
    if (session) return NextResponse.redirect(new URL("/dashboard", request.url));
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/persons/:path*", "/settings/:path*", "/login", "/api/:path*"],
};
