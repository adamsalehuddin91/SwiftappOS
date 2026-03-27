import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}
