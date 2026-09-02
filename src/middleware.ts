import { NextRequest, NextResponse } from "next/server";
import { MIN_AGENT_TOKEN_LENGTH, isAgentRouteAllowed } from "@/lib/agent-auth";
import { secretsMatch } from "@/lib/crypto-edge";
import {
  SESSION_COOKIE,
  SESSION_RENEW_WITHIN_SECONDS,
  issueSession,
  sessionCookieOptions,
  verifySession,
} from "@/lib/session";

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Public routes
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const password = process.env.SWIFTAPP_PASSWORD;

  if (!password) {
    // Fail CLOSED in production. This used to fall through to NextResponse.next(),
    // so a redeploy that dropped SWIFTAPP_PASSWORD would silently publish every
    // invoice, client and receipt to the open internet.
    if (process.env.NODE_ENV === "production") {
      return isApi
        ? jsonError(503, "SWIFTAPP_PASSWORD is not configured — refusing to serve.")
        : new NextResponse(
            "SWIFTAPP_PASSWORD is not configured. Set it and redeploy.",
            { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
          );
    }
    // Local development only.
    return NextResponse.next();
  }

  // ── Machine caller: Authorization: Bearer <AGENT_API_TOKEN> ──────────
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    const presented = authorization.slice("Bearer ".length).trim();
    const agentToken = process.env.AGENT_API_TOKEN;

    if (!agentToken || agentToken.length < MIN_AGENT_TOKEN_LENGTH) {
      return jsonError(
        503,
        `AGENT_API_TOKEN is not configured, or is shorter than ${MIN_AGENT_TOKEN_LENGTH} characters.`
      );
    }

    if (!(await secretsMatch(presented, agentToken))) {
      return jsonError(401, "Invalid agent token.");
    }

    if (!isApi) {
      return jsonError(403, "The agent token is only valid for /api routes.");
    }

    if (!isAgentRouteAllowed(request.method, pathname)) {
      return jsonError(
        403,
        `Agent is not permitted to ${request.method} ${pathname}. See docs/AGENT_API.md for the allowed routes.`
      );
    }

    // Let route handlers know the write came from the agent, not a browser.
    const headers = new Headers(request.headers);
    headers.set("x-swiftapp-caller", "agent");
    return NextResponse.next({ request: { headers } });
  }

  // ── Browser caller: signed, expiring session cookie ──────────────────
  const session = await verifySession(
    request.cookies.get(SESSION_COOKIE)?.value,
    password
  );

  if (!session.valid) {
    // API callers get a JSON 401. They used to get a 307 to the HTML login page,
    // which curl and the agent both read as success — a failed write looked like
    // a completed one and nothing reached the database.
    if (isApi) {
      return jsonError(401, "Not authenticated.");
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();

  // Slide the expiry for a browser that is still in use, so a 30-day absolute
  // lifetime does not mean being logged out every 30 days. An abandoned copy of
  // the cookie stops renewing and dies on schedule.
  if (session.secondsRemaining < SESSION_RENEW_WITHIN_SECONDS) {
    const renewed = await issueSession(password);
    response.cookies.set(
      SESSION_COOKIE,
      renewed.token,
      sessionCookieOptions(renewed.maxAge)
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
