import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapProject, mapMilestone } from "@/lib/mappers";
import { updateProjectSchema } from "@/lib/validations";
import { rejectDisallowedFields, sanitizeForCaller } from "@/lib/agent-guard";
import { recordAudit } from "@/lib/audit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        milestones: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const totalMilestones = project.milestones.length;
    const completedMilestones = project.milestones.filter(
      (m) => m.status === "Completed" || m.status === "Invoiced" || m.status === "Paid"
    ).length;
    const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

    return NextResponse.json(
      sanitizeForCaller(_request, {
        ...mapProject(project),
        milestones: project.milestones.map(mapMilestone),
        progress,
        totalMilestones,
        completedMilestones,
      })
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch project" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // The agent moves a project through its stages; it does not get to rewrite
    // the client, the scope of work, or the archive flag on the way past.
    const refused = rejectDisallowedFields(request, body, ["status"]);
    if (refused) return refused;

    const parsed = updateProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const before = await prisma.project.findUnique({ where: { id } });
    if (!before) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const data = parsed.data;
    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.status !== undefined && { status: data.status }),
        ...(data.sowDetails !== undefined && { sowDetails: data.sowDetails }),
        ...(data.clientName !== undefined && { clientName: data.clientName }),
        ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail || null }),
        ...(data.clientBrn !== undefined && { clientBrn: data.clientBrn }),
        ...(data.isArchived !== undefined && { isArchived: data.isArchived }),
      },
    });

    await recordAudit({
      request,
      entity: "project",
      entityId: id,
      action: "update",
      before: mapProject(before),
      after: mapProject(project),
    });

    return NextResponse.json(sanitizeForCaller(request, mapProject(project)));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update project" },
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
    await prisma.project.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete project" },
      { status: 500 }
    );
  }
}
