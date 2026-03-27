import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { AnalyticsData } from "@/types";

export async function GET() {
  try {
    const year = new Date().getFullYear();
    const yearStart = new Date(`${year}-01-01`);

    const paidReceipts = await prisma.receipt.aggregate({
      _sum: { amountPaid: true },
      where: { createdAt: { gte: yearStart } },
    });

    const pendingInvoices = await prisma.invoice.findMany({
      where: { status: { in: ["Draft", "Sent"] } },
      include: { project: true },
    });

    const paidMilestoneCount = await prisma.milestone.count({
      where: { status: "Paid" },
    });

    const pendingMilestones = await prisma.milestone.findMany({
      where: { status: { in: ["Completed", "Invoiced"] } },
      include: { project: true },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    const monthlyReceipts = await prisma.$queryRaw<
      { month: string; total: number }[]
    >`
      SELECT
        to_char(payment_date, 'Mon') AS month,
        COALESCE(SUM(amount_paid), 0)::float AS total
      FROM receipts
      WHERE created_at >= ${yearStart}
      GROUP BY to_char(payment_date, 'Mon'), EXTRACT(MONTH FROM payment_date)
      ORDER BY EXTRACT(MONTH FROM payment_date)
    `;

    const data: AnalyticsData = {
      netProfit: Number(paidReceipts._sum.amountPaid ?? 0),
      pendingInvoiceCount: pendingInvoices.length,
      pendingInvoiceTotal: pendingInvoices.reduce(
        (sum: number, inv) => sum + Number(inv.amount),
        0
      ),
      paidMilestoneCount,
      monthlyRevenue: monthlyReceipts.map((r) => ({
        month: r.month,
        amount: Number(r.total),
      })),
      pendingMilestones: pendingMilestones.map((m) => ({
        id: m.id,
        name: m.name,
        projectName: m.project.name,
        amount: Number(m.amount),
        status: m.status === "Completed" ? "Needs Invoice" : "Awaiting Payment",
      })),
    };

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load analytics" },
      { status: 500 }
    );
  }
}
