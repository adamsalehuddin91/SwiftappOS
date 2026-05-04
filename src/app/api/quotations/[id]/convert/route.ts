import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { mapInvoice } from "@/lib/mappers";
import { getNextNumber } from "@/lib/sequences";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const billingType: "Deposit" | "Progress" | "Final" | "Monthly" = body.type ?? "Deposit";
    const customAmount: number | undefined = body.amount;

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

    const total = Number(quotation.totalAmount);
    const autoAmounts: Record<string, number> = {
      Deposit:  Math.round(total * 0.5 * 100) / 100,
      Progress: Math.round(total * 0.25 * 100) / 100,
      Final:    Math.round(total * 0.5 * 100) / 100,
      Monthly:  0,
    };
    const invoiceAmount = customAmount ?? autoAmounts[billingType];

    const stageLabels: Record<string, string> = {
      Deposit:  "Bayaran Deposit 50%",
      Progress: "Bayaran Progres 25%",
      Final:    "Bayaran Akhir 50%",
      Monthly:  "Bayaran Bulanan",
    };

    const firstItemTitle = (quotation.items as { description: string }[])[0]?.description?.split("\n")[0] ?? quotation.clientName;

    const invoiceNumber = await getNextNumber("invoice");

    const invoiceData: Prisma.InvoiceUncheckedCreateInput = {
      invoiceNumber,
      projectId: quotation.projectId ?? undefined,
      type: billingType,
      amount: invoiceAmount,
      items: [{
        description: `${stageLabels[billingType]} — ${firstItemTitle}`,
        quantity: 1,
        unitPrice: invoiceAmount,
      }],
      clientName: quotation.clientName,
      clientEmail: quotation.clientEmail,
      clientBrn: quotation.clientBrn,
      notes: quotation.notes,
    };

    const invoice = await prisma.invoice.create({
      data: invoiceData,
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
