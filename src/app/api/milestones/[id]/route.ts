import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapMilestone } from "@/lib/mappers";
import { MilestoneStatus } from "@/generated/prisma/client";
import { updateMilestoneSchema } from "@/lib/validations";
import { validateTransition } from "@/lib/status-workflows";

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
    const parsed = updateMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

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

    return NextResponse.json(mapMilestone(milestone));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update milestone" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.milestone.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete milestone" },
      { status: 500 }
    );
  }
}
