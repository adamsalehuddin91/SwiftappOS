import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;

    const quotations = await prisma.quotation.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
    });

    const header = "Quotation Number,Client,Total (RM),Status,Valid Until,Created";
    const rows = quotations.map((q) =>
      [
        q.quotationNumber,
        `"${q.clientName}"`,
        Number(q.totalAmount).toFixed(2),
        q.status,
        q.validUntil ? q.validUntil.toISOString().split("T")[0] : "",
        q.createdAt.toISOString().split("T")[0],
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=quotations-${new Date().toISOString().split("T")[0]}.csv`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to export quotations" }, { status: 500 });
  }
}
