import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapInvoice } from "@/lib/mappers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: {
        invoice: {
          include: { project: true },
        },
      },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: receipt.id,
      receiptNumber: receipt.receiptNumber,
      amountPaid: Number(receipt.amountPaid),
      paymentMethod: receipt.paymentMethod,
      paymentDate: receipt.paymentDate.toISOString().split("T")[0],
      created_at: receipt.createdAt.toISOString(),
      invoice: {
        id: receipt.invoice.id,
        invoiceNumber: receipt.invoice.invoiceNumber,
        amount: Number(receipt.invoice.amount),
        projectName: receipt.invoice.project?.name ?? null,
        clientName: receipt.invoice.clientName ?? receipt.invoice.project?.clientName ?? null,
        clientBrn: receipt.invoice.clientBrn ?? receipt.invoice.project?.clientBrn ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch receipt" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const receipt = await prisma.receipt.findUnique({
      where: { id },
      include: { invoice: { include: { receipts: true } } },
    });

    if (!receipt) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    await prisma.receipt.delete({ where: { id } });

    // Recalculate invoice status after deleting this receipt
    const remainingTotal = receipt.invoice.receipts
      .filter((r) => r.id !== id)
      .reduce((sum, r) => sum + Number(r.amountPaid), 0);

    const invoiceAmount = Number(receipt.invoice.amount);
    const newStatus = remainingTotal <= 0
      ? "Sent"
      : remainingTotal >= invoiceAmount - 0.01
        ? "Paid"
        : "Sent";

    if (receipt.invoice.status === "Paid" && newStatus !== "Paid") {
      await prisma.invoice.update({
        where: { id: receipt.invoiceId },
        data: { status: newStatus },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to void receipt" }, { status: 500 });
  }
}
