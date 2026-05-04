export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Clock, FileText, Plus, Calendar, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import TimeLogger from "./time-logger";
import CostTracker from "./cost-tracker";
import EditProjectDialog from "./edit-project-dialog";
import ArchiveButton from "./archive-button";
import EditMilestoneDialog from "../edit-milestone-dialog";

const milestoneStatusMap: Record<string, string> = {
  Pending: "Pending",
  InProgress: "In Progress",
  Completed: "Completed",
  Invoiced: "Invoiced",
  Paid: "Paid",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      milestones: { orderBy: { createdAt: "asc" } },
      timeLogs: { orderBy: { date: "desc" } },
      costs: { orderBy: { date: "desc" } }
    },
  });

  if (!project) {
    notFound();
  }

  const milestones = project.milestones.map((m) => ({
    ...m,
    amount: Number(m.amount),
    displayStatus: milestoneStatusMap[m.status] ?? m.status,
  }));

  const totalValue = milestones.reduce((acc, m) => acc + m.amount, 0);
  const totalCosts = project.costs.reduce((acc, c) => acc + Number(c.amount), 0);
  const netProfit = totalValue - totalCosts;

  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter(
    (m) => m.displayStatus === "Completed" || m.displayStatus === "Invoiced" || m.displayStatus === "Paid"
  ).length;
  const progress = totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-border/50 pb-6">
        <Link href="/projects">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-3xl font-black tracking-tight text-foreground">{project.name}</h1>
            <div className="flex items-center gap-2">
              <ArchiveButton projectId={project.id} isArchived={project.isArchived} />
              <EditProjectDialog project={{
                id: project.id,
                name: project.name,
                description: project.description || undefined,
                status: project.status,
                sow_details: project.sowDetails || undefined,
                client_name: project.clientName || undefined,
                client_email: project.clientEmail || undefined,
                client_brn: project.clientBrn || undefined,
                created_at: project.createdAt.toISOString(),
                updated_at: project.updatedAt.toISOString(),
              }} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${project.status === "Live"
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : project.status === "Dev"
                ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                : project.status === "UAT"
                  ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  : "bg-slate-500/10 text-slate-500 border-slate-500/20"
              }`}>
              {project.status}
            </span>
            {project.isArchived && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-orange-500/10 text-orange-500 border-orange-500/20">
                Archived
              </span>
            )}
            <div className="h-4 w-px bg-border"></div>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Started {project.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <div className="h-4 w-px bg-border hidden sm:block"></div>
            <span className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1">
              Net Profit: RM {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {totalMilestones > 0 && (
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Milestone Progress
              </span>
              <span className="text-sm font-bold text-foreground">
                {completedMilestones} / {totalMilestones} completed ({progress}%)
              </span>
            </div>
            <div className="w-full bg-secondary/40 rounded-full h-3 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Scope of Work */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Scope of Work (SOW)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-foreground leading-relaxed">
                {project.sowDetails ?? "No scope of work defined yet."}
              </p>
            </CardContent>
          </Card>

          {/* Milestones */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <Clock className="h-4 w-4 text-primary" />
                Milestones
              </CardTitle>
              <Link href={`/projects/${id}/milestones/new`}>
                <Button size="sm" className="h-8 gap-1 shadow-md shadow-primary/20">
                  <Plus className="h-3 w-3" /> Add Milestone
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-3">
                {milestones.map((milestone) => (
                  <div key={milestone.id} className="group flex items-center justify-between p-4 border border-border/50 rounded-xl bg-secondary/20 hover:bg-secondary/40 transition-all">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-full ${milestone.displayStatus === "Completed" || milestone.displayStatus === "Paid"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : milestone.displayStatus === "In Progress"
                          ? "bg-indigo-500/10 text-indigo-500"
                          : "bg-slate-500/10 text-slate-500"
                        }`}>
                        {milestone.displayStatus === "Completed" || milestone.displayStatus === "Paid"
                          ? <CheckCircle2 className="h-4 w-4" />
                          : <Clock className="h-4 w-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-foreground text-sm">{milestone.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">RM {milestone.amount.toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-full border ${milestone.displayStatus === "Completed" || milestone.displayStatus === "Paid"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : milestone.displayStatus === "In Progress"
                          ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                          : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                        }`}>
                        {milestone.displayStatus}
                      </span>
                      <EditMilestoneDialog milestone={milestone as unknown as import("@/types").Milestone} />
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </div>
                ))}
                {milestones.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No milestones yet. Add one to start tracking progress.
                  </div>
                )}
                {milestones.length > 0 && (
                  <div className="pt-4 mt-2 border-t border-border/50 flex justify-between items-center">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Value</span>
                    <span className="text-lg font-black text-foreground">RM {totalValue.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <TimeLogger projectId={project.id} initialTimeLogs={project.timeLogs as unknown as import("@/types").TimeLog[]} />
          <CostTracker projectId={project.id} initialCosts={project.costs as unknown as import("@/types").ProjectCost[]} />
        </div>

        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Billing Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Link href={`/billing/quotations/new?projectId=${project.id}`} className="block w-full">
                <Button className="w-full justify-start gap-2 h-11" variant="outline">
                  <FileText className="h-4 w-4 text-primary" /> Generate Quotation
                </Button>
              </Link>
              <Link href={`/billing/invoices/new?projectId=${project.id}`} className="block w-full">
                <Button className="w-full justify-start gap-2 h-11" variant="outline">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Create Invoice
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
