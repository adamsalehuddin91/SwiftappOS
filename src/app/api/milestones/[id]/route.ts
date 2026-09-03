import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapMilestone } from "@/lib/mappers";
import { MilestoneStatus } from "@/generated/prisma/client";
import { updateMilestoneSchema } from "@/lib/validations";
import { validateTransition } from "@/lib/status-workflows";
import { isAgentCaller, rejectDisallowedFields, sanitizeForCaller } from "@/lib/agent-guard";
import { recordAudit } from "@/lib/audit";

const statusToPrisma: Record<string, MilestoneStatus> = {
  Pending: "Pending",
  "In Progress": "InProgress",
  Completed: "Completed",
  Invoiced: "Invoiced",
  Paid: "Paid",
};

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Without this the agent could rewrite `amount` while nominally updating a
    // status — turning RM1,000 into RM100 with one call.
    const refused = rejectDisallowedFields(request, body, ["status"]);
    if (refused) return refused;

    const parsed = updateMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const before = await prisma.milestone.findUnique({ where: { id } });

    // Validate status transition if status is being changed
    if (data.status) {
      const current = await prisma.milestone.findUnique({ where: { id } });
      if (!current) {
        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
      }
      const currentDisplay = current.status === "InProgress" ? "In Progress" : current.status;
      const result = validateTransition("milestone", currentDisplay, data.status);
      if (!result.valid) {
        return NextResponse.json(
          { error: `Cannot change status from "${currentDisplay}" to "${data.status}". Allowed: ${result.allowed.join(", ") || "none"}` },
          { status: 400 }
        );
      }
    }

    const milestone = await prisma.milestone.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && {
          status: statusToPrisma[data.status] ?? data.status,
        }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.dueDate !== undefined && {
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
        }),
      },
    });

    await recordAudit({
      request,
      entity: "milestone",
      entityId: id,
      action: data.status !== undefined ? "status" : "update",
      before: before ? mapMilestone(before) : undefined,
      after: mapMilestone(milestone),
    });

    return NextResponse.json(sanitizeForCaller(request, mapMilestone(milestone)));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update milestone" },
      { status: 500 }
    );
  }
}

/**
 * Deleting a milestone takes more with it than the name suggests:
 *
 *   time_logs.milestone_id   ON DELETE CASCADE   every hour logged is destroyed
 *   invoices.milestone_id    ON DELETE SET NULL  the invoice survives but
 *                                                forgets what it billed
 *
 * The agent is therefore confined to milestones that were never used: still
 * Pending or In Progress, never billed, with no hours against them. That covers
 * the real case — one created by mistake — and refuses everything where the
 * deletion would quietly erase a record of money or work. A browser caller is
 * assumed to be looking at the screen and is not blocked, but the response and
 * the audit entry now say what went with it.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const milestone = await prisma.milestone.findUnique({
      where: { id },
      include: {
        _count: { select: { timeLogs: true, invoices: true } },
      },
    });

    // A second delete of the same id is a no-op, not an error: a retry should
    // not look like a failure.
    if (!milestone) {
      return NextResponse.json(
        { success: true, alreadyDeleted: true },
        { status: 200 }
      );
    }

    const blockers: string[] = [];
    if (milestone.status === "Invoiced" || milestone.status === "Paid") {
      blockers.push(`status is ${milestone.status} — money has already been billed against it`);
    }
    if (milestone.invoicedById) blockers.push("it was billed on an invoice");
    if (milestone._count.invoices > 0) blockers.push("an invoice still points at it");
    if (milestone._count.timeLogs > 0) {
      blockers.push(
        `${milestone._count.timeLogs} time log(s) would be destroyed with it`
      );
    }

    if (blockers.length > 0 && isAgentCaller(request)) {
      return NextResponse.json(
        {
          error: "This milestone cannot be deleted by the agent.",
          reasons: blockers,
          hint: "Delete it in the browser if this is really intended.",
        },
        { status: 409 }
      );
    }

    const before = {
      ...mapMilestone(milestone),
      timeLogsDestroyed: milestone._count.timeLogs,
      invoicesUnlinked: milestone._count.invoices,
    };

    await prisma.milestone.delete({ where: { id } });

    await recordAudit({
      request,
      entity: "milestone",
      entityId: id,
      action: "delete",
      before,
    });

    return NextResponse.json({
      success: true,
      timeLogsDestroyed: milestone._count.timeLogs,
      invoicesUnlinked: milestone._count.invoices,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
