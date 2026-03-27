import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const expected = process.env.SWIFTAPP_PASSWORD;

    if (!expected) {
      return NextResponse.json({ error: "Auth not configured" }, { status: 500 });
    }

    if (password !== expected) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    // Create a simple session token
    const encoder = new TextEncoder();
    const data = encoder.encode(expected + "-swiftapp-session");
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const token = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const cookieStore = await cookies();
    cookieStore.set("swiftapp-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
