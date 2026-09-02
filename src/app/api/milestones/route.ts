import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapMilestone } from "@/lib/mappers";
import { createMilestoneSchema } from "@/lib/validations";
import { sanitizeForCaller } from "@/lib/agent-guard";
import { recordAudit } from "@/lib/audit";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createMilestoneSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { projectId, name, description, amount, dueDate } = parsed.data;

    const milestone = await prisma.milestone.create({
      data: {
        projectId,
        name,
        description: description ?? null,
        amount: amount ?? 0,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });

    await recordAudit({
      request,
      entity: "milestone",
      entityId: milestone.id,
      action: "create",
      after: mapMilestone(milestone),
    });

    return NextResponse.json(sanitizeForCaller(request, mapMilestone(milestone)), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create milestone" },
      { status: 500 }
    );
  }
}
