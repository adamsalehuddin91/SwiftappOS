import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateProjectCostSchema } from "@/lib/validations";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateProjectCostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const projectCost = await prisma.projectCost.update({
      where: { id },
      data: {
        ...(data.category !== undefined && { category: data.category }),
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.reference !== undefined && { reference: data.reference }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
      },
    });

    return NextResponse.json(projectCost);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update project cost" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.projectCost.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete project cost" }, { status: 500 });
  }
}
