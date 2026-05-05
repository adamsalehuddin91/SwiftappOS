import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNextNumber } from "@/lib/sequences";
import { z } from "zod";

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.string().max(100).optional().nullable(),
  paymentDate: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const receipts = await prisma.receipt.findMany({
      where: { invoiceId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(receipts);
  } catch {
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

    const body = await request.json();
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { amount, paymentMethod, paymentDate } = parsed.data;

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { receipts: true },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    if (invoice.status === "Paid") {
      return NextResponse.json({ error: "Invoice is already fully paid" }, { status: 400 });
    }
    if (invoice.status === "Void") {
      return NextResponse.json({ error: "Cannot pay a void invoice" }, { status: 400 });
    }

    const totalAlreadyPaid = invoice.receipts.reduce((sum, r) => sum + Number(r.amountPaid), 0);
    const remaining = Number(invoice.amount) - totalAlreadyPaid;

    if (amount > remaining + 0.01) {
      return NextResponse.json(
        { error: `Amount exceeds remaining balance of RM ${remaining.toFixed(2)}` },
        { status: 400 }
      );
    }

    const receiptNumber = await getNextNumber("receipt");

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        invoiceId,
        amountPaid: amount,
        paymentMethod: paymentMethod ?? null,
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
      },
    });

    // Auto-mark Paid if fully settled
    const totalPaid = totalAlreadyPaid + amount;
    if (totalPaid >= Number(invoice.amount) - 0.01) {
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "Paid" },
      });
    }

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record payment" },
      { status: 500 }
    );
  }
}
