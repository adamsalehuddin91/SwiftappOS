import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;

    const invoices = await prisma.invoice.findMany({
      where: status ? { status: status as never } : undefined,
      orderBy: { createdAt: "desc" },
      include: { project: true },
    });

    const header = "Invoice Number,Project,Type,Amount (RM),Status,Due Date,Created";
    const rows = invoices.map((inv) =>
      [
        inv.invoiceNumber,
        `"${inv.project?.name ?? "-"}"`,
        inv.type,
        Number(inv.amount).toFixed(2),
        inv.status,
        inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : "",
        inv.createdAt.toISOString().split("T")[0],
      ].join(",")
    );

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename=invoices-${new Date().toISOString().split("T")[0]}.csv`,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to export invoices" }, { status: 500 });
  }
}
