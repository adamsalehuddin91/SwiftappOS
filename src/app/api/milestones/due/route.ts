import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { z } from "zod";

/**
 * Milestones that are due, or already overdue — the read the reminder cron polls.
 *
 * Read-only by design: the agent decides nothing here, it only reports. Anything
 * that changes a milestone still goes through PATCH /api/milestones/[id], which
 * enforces the status workflow.
 *
 * GET /api/milestones/due?days=3
 */

const querySchema = z.object({
  // Clamp rather than reject, so a caller asking for ?days=999 gets the 90-day
  // window instead of a 500 and an empty reminder (AP-037).
  days: z.coerce
    .number()
    .int()
    .min(0)
    .default(3)
    .transform((n) => Math.min(n, 90)),
});

/** Midnight UTC today — dueDate is a DATE column, so compare on whole days. */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const { days } = querySchema.parse({ days: url.searchParams.get("days") ?? 3 });

    const today = todayUtc();
    const horizon = new Date(today.getTime() + days * MS_PER_DAY);

    const milestones = await prisma.milestone.findMany({
      where: {
        dueDate: { not: null, lte: horizon },
        status: { in: ["Pending", "InProgress"] },
        project: { isArchived: false, status: { not: "Completed" } },
      },
      include: { project: true },
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      take: 100,
    });

    const items = milestones.map((m) => {
      const due = m.dueDate as Date;
      const daysUntilDue = Math.round((due.getTime() - today.getTime()) / MS_PER_DAY);
      return {
        id: m.id,
        name: m.name,
        status: m.status === "InProgress" ? "In Progress" : m.status,
        amount: Number(m.amount),
        dueDate: due.toISOString().split("T")[0],
        daysUntilDue,
        overdue: daysUntilDue < 0,
        projectId: m.projectId,
        projectName: m.project.name,
        projectStatus: m.project.status,
        clientName: m.project.clientName ?? null,
      };
    });

    const overdue = items.filter((i) => i.overdue);
    const dueSoon = items.filter((i) => !i.overdue);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      windowDays: days,
      counts: {
        total: items.length,
        overdue: overdue.length,
        dueSoon: dueSoon.length,
      },
      totalAmount: items.reduce((sum, i) => sum + i.amount, 0),
      overdueAmount: overdue.reduce((sum, i) => sum + i.amount, 0),
      milestones: items,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch due milestones" },
      { status: 500 }
    );
  }
}
