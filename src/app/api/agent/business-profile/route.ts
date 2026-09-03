import { NextResponse } from "next/server";
import { loadCompanyDetails, sanitizeCompanyDetails } from "@/lib/pdf-render";

/**
 * GET /api/agent/business-profile
 *
 * The header fields of a document, and nothing else. Bank name, account number
 * and SWIFT never leave this route — they are the one part of the profile worth
 * stealing, and previewing a quotation does not need them.
 *
 * Rendering does not need this route at all: /api/quotations/[id]/pdf reads the
 * profile itself, server-side. This exists only so the agent can show a header
 * in a chat before a document is generated.
 */
export async function GET() {
  try {
    const details = sanitizeCompanyDetails(await loadCompanyDetails());

    if (!details) {
      return NextResponse.json(
        { error: "Business profile has not been set up yet." },
        { status: 404 }
      );
    }

    return NextResponse.json(details);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to read business profile" },
      { status: 500 }
    );
  }
}
