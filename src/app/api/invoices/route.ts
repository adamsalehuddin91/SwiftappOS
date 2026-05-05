import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapInvoice } from "@/lib/mappers";
import { createInvoiceSchema, paginationSchema } from "@/lib/validations";
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
          { invoiceNumber: { contains: params.search, mode: "insensitive" as const } },
          { project: { name: { contains: params.search, mode: "insensitive" as const } } },
        ],
      }),
      ...(params.status && { status: params.status as never }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { project: true },
        ...getPaginationParams(params.page, params.limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json(
      buildPaginatedResponse(invoices.map(mapInvoice), total, params.page, params.limit)
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const invoiceNumber = await getNextNumber("invoice");

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        projectId: data.projectId,
        milestoneId: data.milestoneId ?? null,
        type: data.type,
        amount: data.amount,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        items: data.items ?? [],
        clientName: data.clientName ?? null,
        clientEmail: data.clientEmail || null,
        clientBrn: data.clientBrn ?? null,
        notes: data.notes ?? null,
      },
      include: { project: true },
    });

    // Auto-sync: mark project's Completed milestones → Invoiced
    if (data.projectId) {
      await prisma.milestone.updateMany({
        where: { projectId: data.projectId, status: "Completed" },
        data: { status: "Invoiced" },
      });
    }

    return NextResponse.json(mapInvoice(invoice), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice" },
      { status: 500 }
    );
  }
}
