import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapInvoice } from "@/lib/mappers";
import { getNextNumber } from "@/lib/sequences";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const quotation = await prisma.quotation.findUnique({ where: { id } });

    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (quotation.status !== "Accepted") {
      return NextResponse.json(
        { error: "Only accepted quotations can be converted to invoices" },
        { status: 400 }
      );
    }

    if (!quotation.projectId) {
      return NextResponse.json(
        { error: "Quotation must be linked to a project" },
        { status: 400 }
      );
    }

    const invoiceNumber = await getNextNumber("invoice");

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        projectId: quotation.projectId,
        type: "Final",
        amount: Number(quotation.totalAmount),
        items: quotation.items ?? [],
        clientName: quotation.clientName,
        clientEmail: quotation.clientEmail,
        clientBrn: quotation.clientBrn,
      },
      include: { project: true },
    });

    return NextResponse.json(mapInvoice(invoice), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to convert quotation" },
      { status: 500 }
    );
  }
}
