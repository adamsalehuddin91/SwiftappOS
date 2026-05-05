import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
