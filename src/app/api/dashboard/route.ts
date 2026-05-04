import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const [activeProjects, pendingMilestones, paidReceipts, recentProjects, overdueInvoices] =
      await Promise.all([
        prisma.project.count({
          where: { status: { in: ["Dev", "UAT"] }, isArchived: false },
        }),
        prisma.milestone.count({
          where: { status: { in: ["Pending", "InProgress"] } },
        }),
        prisma.receipt.aggregate({
          _sum: { amountPaid: true },
          where: {
            createdAt: {
              gte: new Date(`${new Date().getFullYear()}-01-01`),
            },
          },
        }),
        prisma.project.findMany({
          take: 5,
          where: { isArchived: false },
          orderBy: { updatedAt: "desc" },
          include: {
            milestones: {
              where: { status: { in: ["Pending", "InProgress"] } },
              take: 1,
              orderBy: { createdAt: "asc" },
            },
          },
        }),
        prisma.invoice.findMany({
          where: {
            status: { in: ["Draft", "Sent"] },
            dueDate: { lt: new Date() },
          },
          include: { project: true },
          orderBy: { dueDate: "asc" },
        }),
      ]);

    return NextResponse.json({
      activeProjects,
      pendingMilestones,
      revenueYtd: Number(paidReceipts._sum.amountPaid ?? 0),
      recentProjects: recentProjects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        currentMilestone: p.milestones[0]?.name ?? null,
      })),
      overdueInvoices: overdueInvoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amount: Number(inv.amount),
        dueDate: inv.dueDate?.toISOString() ?? null,
        projectName: inv.project?.name ?? "-",
        daysPastDue: inv.dueDate
          ? Math.floor((Date.now() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24))
          : 0,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
