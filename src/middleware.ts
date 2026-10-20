import { NextResponse, type NextRequest } from "next/server";

// Cheap edge check: bounce visitors without a session cookie to /login.
// Pages still validate the session against the database (see lib/auth.ts).
export function middleware(req: NextRequest) {
  if (!req.cookies.has("apptrack_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/board/:path*", "/stats/:path*", "/applications/:path*"] };
