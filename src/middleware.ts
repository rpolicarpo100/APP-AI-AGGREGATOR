import { NextRequest, NextResponse } from "next/server";

/**
 * Optional Basic Auth.
 *
 * The dashboard surfaces names, health and activity of private repositories,
 * so any public deployment should be protected. Set DASHBOARD_USER and
 * DASHBOARD_PASSWORD to enable; leave them unset for local development.
 */
export function middleware(req: NextRequest) {
  const user = process.env.DASHBOARD_USER;
  const password = process.env.DASHBOARD_PASSWORD;

  if (!user || !password) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const idx = decoded.indexOf(":");
    const givenUser = idx >= 0 ? decoded.slice(0, idx) : "";
    const givenPass = idx >= 0 ? decoded.slice(idx + 1) : "";

    if (safeEqual(givenUser, user) && safeEqual(givenPass, password)) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="APP AI AGGREGATOR", charset="UTF-8"',
    },
  });
}

/** Length-independent comparison to avoid leaking timing information. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
