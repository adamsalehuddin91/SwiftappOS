import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const yearStart = new Date(`${new Date().getFullYear()}-01-01`);

    const [revenueYtd, pendingAgg, paidCount, draftQuotations, totalQuotations] =
      await Promise.all([
        prisma.receipt.aggregate({
          _sum: { amountPaid: true },
          where: { createdAt: { gte: yearStart } },
        }),
        prisma.invoice.aggregate({
          _sum: { amount: true },
          _count: { id: true },
          where: { status: { in: ["Draft", "Sent"] } },
        }),
        prisma.invoice.count({ where: { status: "Paid" } }),
        prisma.quotation.count({ where: { status: "Draft" } }),
        prisma.quotation.count(),
      ]);

    return NextResponse.json({
      revenueYtd: Number(revenueYtd._sum.amountPaid ?? 0),
      pendingCount: pendingAgg._count.id,
      pendingTotal: Number(pendingAgg._sum.amount ?? 0),
      paidCount,
      draftQuotations,
      totalQuotations,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load billing stats" },
      { status: 500 }
    );
  }
}
