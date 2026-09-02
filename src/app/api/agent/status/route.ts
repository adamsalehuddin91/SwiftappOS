import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Sanitised health and volume check for the agent.
 *
 * Counts and totals only — no names, no ids, no client details. `swiftos check`
 * points here so that proving the connection works does not require pulling
 * real client data through the agent every time.
 *
 * GET /api/agent/status
 */

function tally(rows: { status: string; _count: { _all: number } }[]) {
  return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
}

export async function GET() {
  try {
    const now = new Date();
    const today = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const yearStart = new Date(`${now.getUTCFullYear()}-01-01`);

    const [
      projects,
      quotations,
      invoices,
      receiptCount,
      collected,
      unpaidInvoices,
      pendingMilestones,
      overdueMilestones,
      lastAudit,
    ] = await Promise.all([
      prisma.project.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.quotation.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.invoice.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.receipt.count(),
      prisma.receipt.aggregate({
        _sum: { amountPaid: true },
        where: { createdAt: { gte: yearStart } },
      }),
      prisma.invoice.findMany({
        where: { status: { in: ["Draft", "Sent"] } },
        select: { amount: true },
      }),
      prisma.milestone.count({ where: { status: { in: ["Pending", "InProgress"] } } }),
      prisma.milestone.count({
        where: {
          status: { in: ["Pending", "InProgress"] },
          dueDate: { not: null, lt: today },
          project: { isArchived: false, status: { not: "Completed" } },
        },
      }),
      prisma.auditLog.findFirst({
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    return NextResponse.json({
      status: "ok",
      generatedAt: now.toISOString(),
      projects: {
        total: projects.reduce((sum, r) => sum + r._count._all, 0),
        byStatus: tally(projects),
      },
      quotations: {
        total: quotations.reduce((sum, r) => sum + r._count._all, 0),
        byStatus: tally(quotations),
      },
      invoices: {
        total: invoices.reduce((sum, r) => sum + r._count._all, 0),
        byStatus: tally(invoices),
        outstandingAmount: unpaidInvoices.reduce((sum, i) => sum + Number(i.amount), 0),
      },
      receipts: {
        total: receiptCount,
        collectedThisYear: Number(collected._sum.amountPaid ?? 0),
      },
      milestones: {
        pending: pendingMilestones,
        overdue: overdueMilestones,
      },
      lastWriteAt: lastAudit?.createdAt.toISOString() ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        error: error instanceof Error ? error.message : "Failed to build status",
      },
      { status: 500 }
    );
  }
}
