import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapQuotation } from "@/lib/mappers";
import { getNextNumber } from "@/lib/sequences";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const original = await prisma.quotation.findUnique({ where: { id } });

    if (!original) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const quotationNumber = await getNextNumber("quotation");

    const duplicate = await prisma.quotation.create({
      data: {
        quotationNumber,
        projectId: original.projectId,
        clientName: original.clientName,
        clientEmail: original.clientEmail,
        clientBrn: original.clientBrn,
        items: original.items ?? [],
        totalAmount: original.totalAmount,
        notes: original.notes,
        validUntil: null,
        status: "Draft",
      },
    });

    return NextResponse.json(mapQuotation(duplicate), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to duplicate quotation" },
      { status: 500 }
    );
  }
}
