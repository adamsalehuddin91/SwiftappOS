export const dynamic = "force-dynamic";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FolderKanban, Receipt, PieChart, Activity, Clock, MoreHorizontal, ArrowUpRight, AlertTriangle } from "lucide-react";
import Link from "next/link";
import prisma from "@/lib/prisma";

export default async function Home() {
  const [activeProjects, pendingMilestones, paidReceipts, recentProjects, overdueInvoicesRaw] =
    await Promise.all([
      prisma.project.count({
        where: { status: { in: ["Dev", "UAT"] } },
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
        include: {
          project: { select: { name: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
    ]);

  const revenueYtd = Number(paidReceipts._sum.amountPaid ?? 0);

  const now = new Date();
  const overdueInvoices = overdueInvoicesRaw.map((inv) => {
    const dueDate = inv.dueDate ? new Date(inv.dueDate) : null;
    const daysPastDue = dueDate
      ? Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      amount: Number(inv.amount),
      dueDate: dueDate ? dueDate.toISOString().split("T")[0] : null,
      projectName: inv.project?.name ?? "Unknown",
      daysPastDue,
    };
  });

  const statusColor: Record<string, string> = {
    Dev: "border-indigo-500/30 bg-indigo-500/10 text-indigo-500",
    UAT: "border-amber-500/30 bg-amber-500/10 text-amber-500",
    Live: "border-emerald-500/30 bg-emerald-500/10 text-emerald-500",
    Drafting: "border-slate-500/30 bg-slate-500/10 text-slate-500",
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Overview of your development ecosystem.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">System Online</span>
        </div>
      </div>

      {/* Overdue Invoices Alert */}
      {overdueInvoices.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/5 shadow-lg shadow-red-500/5">
          <CardHeader className="pb-3 border-b border-red-500/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-red-500">
                <AlertTriangle className="h-4 w-4" />
                Overdue Invoices ({overdueInvoices.length})
              </CardTitle>
              <Link href="/billing/invoices" className="text-xs font-bold text-red-500 hover:text-red-400 uppercase tracking-widest transition-colors">
                View All
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-2">
              {overdueInvoices.map((inv) => (
                <Link key={inv.id} href={`/billing/invoices/${inv.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-red-500/10 bg-red-500/5 hover:bg-red-500/10 transition-colors">
                    <div>
                      <span className="font-bold text-sm text-foreground">{inv.invoiceNumber}</span>
                      <span className="text-xs text-muted-foreground ml-2">{inv.projectName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-foreground">RM {inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
                        {inv.daysPastDue}d overdue
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-2xl shadow-primary/5 transition-all hover:border-primary/40 group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <FolderKanban className="h-16 w-16 text-primary/10 -rotate-12 transform group-hover:scale-110 transition-transform" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Active Projects</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-black text-foreground">{activeProjects}</div>
            <div className="flex items-center pt-2 text-xs text-muted-foreground">
              <span className="flex items-center text-emerald-500 font-bold mr-2 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                Active
              </span>
              in dev or UAT
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-2xl shadow-primary/5 transition-all hover:border-primary/40 group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <Clock className="h-16 w-16 text-indigo-500/10 -rotate-12 transform group-hover:scale-110 transition-transform" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Pending Milestones</CardTitle>
            <Clock className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-black text-foreground">{pendingMilestones}</div>
            <div className="flex items-center pt-2 text-xs text-muted-foreground">
              <span className="flex items-center text-amber-500 font-bold mr-2 bg-amber-500/10 px-2 py-0.5 rounded-full">
                Due Soon
              </span>
              pending or in progress
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-primary/5 shadow-2xl shadow-primary/5 transition-all hover:border-primary/40 group">
          <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
            <PieChart className="h-16 w-16 text-emerald-500/10 -rotate-12 transform group-hover:scale-110 transition-transform" />
          </div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Revenue (YTD)</CardTitle>
            <Receipt className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-4xl font-black text-foreground">
              RM {revenueYtd >= 1000 ? `${(revenueYtd / 1000).toFixed(0)}k` : revenueYtd.toLocaleString()}
            </div>
            <div className="flex items-center pt-2 text-xs text-muted-foreground">
              <span className="flex items-center text-emerald-500 font-bold mr-2 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                YTD
              </span>
              from paid receipts
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Projects Table */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Projects</CardTitle>
              <CardDescription>Latest active builds in the ecosystem.</CardDescription>
            </div>
            <Link href="/projects" className="text-xs font-bold text-primary hover:text-primary/80 uppercase tracking-widest transition-colors">
              View All
            </Link>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/50 text-xs uppercase font-bold tracking-wider text-muted-foreground">
                  <th className="px-6 py-4">Project Name</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Milestone</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {recentProjects.map((project) => (
                  <tr key={project.id} className="group hover:bg-secondary/30 transition-colors">
                    <td className="px-6 py-4">
                      <Link href={`/projects/${project.id}`}>
                        <div className="font-bold text-foreground">{project.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {project.id.slice(0, 8)}</div>
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusColor[project.status] ?? statusColor.Drafting}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {project.milestones[0]?.name ?? "No pending milestones"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/projects/${project.id}`}>
                        <button className="text-muted-foreground hover:text-foreground transition-colors">
                          <MoreHorizontal className="h-5 w-5" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
                {recentProjects.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                      No projects yet. Create your first project to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
