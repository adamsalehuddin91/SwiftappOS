import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const password = process.env.SWIFTAPP_PASSWORD;

  // Skip auth if no password configured (dev mode)
  if (!password) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // Public routes
  if (pathname === "/login" || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("swiftapp-session")?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Verify token
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "-swiftapp-session");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const expectedToken = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (sessionToken !== expectedToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
