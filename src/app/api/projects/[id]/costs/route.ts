import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createProjectCostSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const costs = await prisma.projectCost.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(costs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch project costs" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const parsed = createProjectCostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const projectCost = await prisma.projectCost.create({
      data: {
        projectId,
        category: data.category,
        amount: data.amount,
        description: data.description,
        date: new Date(data.date),
        reference: data.reference || null,
      },
    });

    return NextResponse.json(projectCost);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create project cost" }, { status: 500 });
  }
}
