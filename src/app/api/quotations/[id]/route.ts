import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapQuotation } from "@/lib/mappers";
import { updateQuotationSchema, updateQuotationStatusSchema } from "@/lib/validations";
import { validateTransition } from "@/lib/status-workflows";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({
      where: { id },
    });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    return NextResponse.json(mapQuotation(quotation));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch quotation" },
      { status: 500 }
    );
  }
}

// Full edit (only when Draft)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }
    if (existing.status !== "Draft") {
      return NextResponse.json({ error: "Only draft quotations can be edited" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateQuotationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    let totalAmount: number | undefined;
    if (data.items) {
      totalAmount = data.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        ...(data.clientName !== undefined && { clientName: data.clientName }),
        ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail || null }),
        ...(data.clientBrn !== undefined && { clientBrn: data.clientBrn }),
        ...(data.clientPhone !== undefined && { clientPhone: data.clientPhone }),
        ...(data.items !== undefined && { items: data.items }),
        ...(totalAmount !== undefined && { totalAmount }),
        ...(data.notes !== undefined && { notes: data.notes }),
        ...(data.validUntil !== undefined && { validUntil: data.validUntil ? new Date(data.validUntil) : null }),
      },
    });

    return NextResponse.json(mapQuotation(quotation));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update quotation" },
      { status: 500 }
    );
  }
}

// Status update only (with workflow validation)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateQuotationStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const result = validateTransition("quotation", existing.status, parsed.data.status);
    if (!result.valid) {
      return NextResponse.json(
        { error: `Cannot change status from "${existing.status}" to "${parsed.data.status}". Allowed: ${result.allowed.join(", ") || "none"}` },
        { status: 400 }
      );
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { status: parsed.data.status },
    });

    return NextResponse.json(mapQuotation(quotation));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update quotation status" },
      { status: 500 }
    );
  }
}
