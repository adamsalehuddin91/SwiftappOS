import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildDeliveryChecklist } from "@/lib/delivery-checklist";
import { completeProjectSchema } from "@/lib/validations";
import { recordAudit } from "@/lib/audit";

/**
 * Close a project and freeze its handover checklist.
 *
 * POST /api/projects/[id]/complete
 *   { "dryRun": true }  -> build the checklist, change nothing
 *   { "force": true }   -> complete even with blockers (unpaid balance, etc.)
 *
 * Blockers refuse with 409 by default rather than completing quietly. Closing a
 * project with money still outstanding is a decision, not a default.
 */

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const raw = await request.json().catch(() => ({}));
    const parsed = completeProjectSchema.safeParse(raw ?? {});
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const { force, dryRun, notes } = parsed.data;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        milestones: true,
        quotations: true,
        invoices: { include: { receipts: true } },
        costs: true,
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const checklist = buildDeliveryChecklist({
      projectStatus: project.status,
      milestones: project.milestones.map((m) => ({
        name: m.name,
        status: m.status === "InProgress" ? "In Progress" : m.status,
        amount: Number(m.amount),
      })),
      invoices: project.invoices.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        status: i.status,
        amount: Number(i.amount),
        paid: i.receipts.reduce((sum, r) => sum + Number(r.amountPaid), 0),
      })),
      quotations: project.quotations.map((q) => ({
        quotationNumber: q.quotationNumber,
        status: q.status,
      })),
      costCount: project.costs.length,
    });

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        projectId: project.id,
        projectName: project.name,
        currentStatus: project.status,
        canComplete: checklist.blockers.length === 0,
        checklist,
      });
    }

    if (project.status === "Completed") {
      return NextResponse.json(
        {
          error: "Project is already completed.",
          completedAt: project.completedAt?.toISOString() ?? null,
          checklist: project.deliveryChecklist,
        },
        { status: 409 }
      );
    }

    if (checklist.blockers.length > 0 && !force) {
      return NextResponse.json(
        {
          error: "Project is not ready to be completed.",
          blockers: checklist.blockers,
          hint: "Resolve the blockers, or repeat with { \"force\": true } to close anyway.",
          checklist,
        },
        { status: 409 }
      );
    }

    const stored = {
      ...checklist,
      completedWithBlockers: checklist.blockers.length > 0,
      notes: notes ?? null,
    };

    const updated = await prisma.project.update({
      where: { id },
      data: {
        status: "Completed",
        completedAt: new Date(),
        deliveryChecklist: stored as never,
      },
    });

    await recordAudit({
      request,
      entity: "project",
      entityId: updated.id,
      action: "complete",
      before: { status: project.status, completedAt: null },
      after: {
        status: updated.status,
        completedAt: updated.completedAt,
        completedWithBlockers: stored.completedWithBlockers,
        blockers: checklist.blockers,
      },
    });

    return NextResponse.json({
      projectId: updated.id,
      projectName: updated.name,
      status: updated.status,
      completedAt: updated.completedAt?.toISOString() ?? null,
      completedWithBlockers: stored.completedWithBlockers,
      checklist: stored,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to complete project" },
      { status: 500 }
    );
  }
}
