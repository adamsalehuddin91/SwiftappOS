import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapQuotation } from "@/lib/mappers";
import { createQuotationSchema, paginationSchema } from "@/lib/validations";
import { getNextNumber } from "@/lib/sequences";
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

    const where = {
      ...(params.search && {
        OR: [
          { quotationNumber: { contains: params.search, mode: "insensitive" as const } },
          { clientName: { contains: params.search, mode: "insensitive" as const } },
        ],
      }),
      ...(params.status && { status: params.status as never }),
    };

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...getPaginationParams(params.page, params.limit),
      }),
      prisma.quotation.count({ where }),
    ]);

    return NextResponse.json(
      buildPaginatedResponse(quotations.map(mapQuotation), total, params.page, params.limit)
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch quotations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createQuotationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    const quotationNumber = await getNextNumber("quotation");

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        projectId: data.projectId ?? null,
        clientName: data.clientName,
        clientEmail: data.clientEmail || null,
        clientBrn: data.clientBrn ?? null,
        items: data.items,
        totalAmount,
        notes: data.notes ?? null,
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
      },
    });

    return NextResponse.json(mapQuotation(quotation), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create quotation" },
      { status: 500 }
    );
  }
}
