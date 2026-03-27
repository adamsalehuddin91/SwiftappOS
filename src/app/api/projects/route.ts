import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapProject } from "@/lib/mappers";
import { createProjectSchema, paginationSchema } from "@/lib/validations";
import { getPaginationParams, buildPaginatedResponse } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = paginationSchema.parse({
      page: url.searchParams.get("page") ?? 1,
      limit: url.searchParams.get("limit") ?? 20,
      search: url.searchParams.get("search") ?? "",
      status: url.searchParams.get("status") ?? "",
    });

    const showArchived = url.searchParams.get("archived") === "true";

    const where = {
      isArchived: showArchived,
      ...(params.search && {
        OR: [
          { name: { contains: params.search, mode: "insensitive" as const } },
          { clientName: { contains: params.search, mode: "insensitive" as const } },
        ],
      }),
      ...(params.status && { status: params.status as never }),
    };

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        ...getPaginationParams(params.page, params.limit),
      }),
      prisma.project.count({ where }),
    ]);

    return NextResponse.json(
      buildPaginatedResponse(projects.map(mapProject), total, params.page, params.limit)
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { name, description, status, sowDetails, clientName, clientEmail } = parsed.data;

    const project = await prisma.project.create({
      data: {
        name,
        description: description ?? null,
        status: status ?? "Drafting",
        sowDetails: sowDetails ?? null,
        clientName: clientName ?? null,
        clientEmail: clientEmail || null,
      },
    });

    return NextResponse.json(mapProject(project), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create project" },
      { status: 500 }
    );
  }
}
