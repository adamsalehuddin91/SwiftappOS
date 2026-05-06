import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapInvoice } from "@/lib/mappers";
import { updateInvoiceSchema, updateInvoiceStatusSchema } from "@/lib/validations";
import { validateTransition } from "@/lib/status-workflows";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: { project: true, receipts: { orderBy: { createdAt: "desc" } } },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...mapInvoice(invoice),
      receipts: invoice.receipts,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invoice" },
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
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (existing.status !== "Draft" && existing.status !== "Sent") {
      return NextResponse.json({ error: "Only Draft or Sent invoices can be edited" }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateInvoiceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;
    const isSent = existing.status === "Sent";

    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        // Lock amount, type, items for Sent invoices
        ...(!isSent && data.type !== undefined && { type: data.type }),
        ...(!isSent && data.amount !== undefined && { amount: data.amount }),
        ...(!isSent && data.items !== undefined && { items: data.items }),
        // Always editable
        ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
        ...(data.clientName !== undefined && { clientName: data.clientName }),
        ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail || null }),
        ...(data.clientBrn !== undefined && { clientBrn: data.clientBrn }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: { project: true },
    });

    return NextResponse.json(mapInvoice(invoice));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update invoice" },
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
    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    await prisma.invoice.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete invoice" },
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
    const parsed = updateInvoiceStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const result = validateTransition("invoice", existing.status, parsed.data.status);
    if (!result.valid) {
      return NextResponse.json(
        { error: `Cannot change status from "${existing.status}" to "${parsed.data.status}". Allowed: ${result.allowed.join(", ") || "none"}` },
        { status: 400 }
      );
    }

    const invoice = await prisma.invoice.update({
      where: { id },
      data: { status: parsed.data.status },
      include: { project: true },
    });

    return NextResponse.json(mapInvoice(invoice));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update invoice status" },
      { status: 500 }
    );
  }
}
