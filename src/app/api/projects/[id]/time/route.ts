import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createTimeLogSchema } from "@/lib/validations";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const timeLogs = await prisma.timeLog.findMany({
      where: { projectId },
      orderBy: { date: "desc" },
    });

    return NextResponse.json(timeLogs);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch time logs" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await request.json();
    const parsed = createTimeLogSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const timeLog = await prisma.timeLog.create({
      data: {
        projectId,
        milestoneId: data.milestoneId || null,
        hours: data.hours,
        description: data.description,
        date: new Date(data.date),
      },
    });

    return NextResponse.json(timeLog);
  } catch (error) {
    return NextResponse.json({ error: "Failed to create time log" }, { status: 500 });
  }
}
