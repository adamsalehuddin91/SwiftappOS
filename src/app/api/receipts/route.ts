import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { createReceiptSchema } from "@/lib/validations";
import { getNextNumber } from "@/lib/sequences";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
    const skip = (page - 1) * limit;

    const [receipts, total] = await Promise.all([
      prisma.receipt.findMany({
        orderBy: { paymentDate: "desc" },
        include: { invoice: { include: { project: true } } },
        skip,
        take: limit,
      }),
      prisma.receipt.count(),
    ]);

    return NextResponse.json({
      data: receipts.map((r) => ({
        id: r.id,
        receiptNumber: r.receiptNumber,
        amountPaid: Number(r.amountPaid),
        paymentMethod: r.paymentMethod,
        paymentDate: r.paymentDate.toISOString().split("T")[0],
        clientName: r.invoice.clientName ?? r.invoice.project?.clientName ?? null,
        invoiceNumber: r.invoice.invoiceNumber,
        invoiceId: r.invoiceId,
        projectName: r.invoice.project?.name ?? null,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createReceiptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    // Check invoice exists and isn't already fully paid
    const invoice = await prisma.invoice.findUnique({
      where: { id: data.invoiceId },
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

    const receiptNumber = await getNextNumber("receipt");

    const receipt = await prisma.receipt.create({
      data: {
        receiptNumber,
        invoiceId: data.invoiceId,
        amountPaid: data.amountPaid,
        paymentMethod: data.paymentMethod ?? null,
        paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
      },
    });

    // Check if total paid >= invoice amount, auto-mark as Paid
    const totalPaid = invoice.receipts.reduce(
      (sum, r) => sum + Number(r.amountPaid),
      0
    ) + data.amountPaid;

    if (totalPaid >= Number(invoice.amount)) {
      await prisma.invoice.update({
        where: { id: data.invoiceId },
        data: { status: "Paid" },
      });
    }

    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create receipt" },
      { status: 500 }
    );
  }
}
