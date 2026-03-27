"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowDownRight, DollarSign, Bell, TrendingUp, Loader2 } from "lucide-react";
import type { AnalyticsData } from "@/types";

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-24 text-muted-foreground">
        Failed to load analytics data.
      </div>
    );
  }

  const maxRevenue = data.monthlyRevenue.length > 0
    ? Math.max(...data.monthlyRevenue.map((d) => d.amount))
    : 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Cashflow & Analytics</h1>
          <p className="text-muted-foreground mt-1">Real-time financial monitoring.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Net Profit (YTD)</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-black text-foreground">RM {data.netProfit.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</div>
            <p className="text-xs text-emerald-500 mt-1 font-bold">From paid receipts</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-xl group-hover:bg-amber-500/20 transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Incoming (Pending)</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-black text-foreground">RM {data.pendingInvoiceTotal.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</div>
            <div className="text-xs text-muted-foreground mt-1">
              <span className="text-amber-500 font-bold">{data.pendingInvoiceCount} Invoices</span> due soon
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Paid Milestones</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-black text-foreground">{data.paidMilestoneCount}</div>
            <p className="text-xs text-muted-foreground mt-1">All time completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="text-base font-bold uppercase tracking-widest text-muted-foreground">Revenue Overview</CardTitle>
            <CardDescription>Monthly revenue performance.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {data.monthlyRevenue.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                No revenue data yet. Payments will appear here.
              </div>
            ) : (
              <div className="h-[200px] flex items-end gap-3 mt-4">
                {data.monthlyRevenue.map((d) => (
                  <div key={d.month} className="flex-1 flex flex-col items-center gap-2 group">
                    <div
                      className="w-full bg-indigo-500/20 rounded-t-md transition-all group-hover:bg-indigo-500 relative border-t border-x border-indigo-500/30"
                      style={{ height: `${(d.amount / maxRevenue) * 100}%` }}
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                        {d.amount >= 1000 ? `${(d.amount / 1000).toFixed(1)}k` : d.amount}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-muted-foreground">{d.month}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-bold uppercase tracking-widest text-muted-foreground">
              <Bell className="h-4 w-4 text-primary" />
              Action Items
            </CardTitle>
            <CardDescription>Milestones needing invoicing or follow-up.</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            {data.pendingMilestones.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                All caught up! No pending milestones.
              </div>
            ) : (
              <div className="space-y-4">
                {data.pendingMilestones.map((m) => (
                  <div
                    key={m.id}
                    className={`flex items-center justify-between p-4 rounded-xl border hover:opacity-90 transition-colors ${
                      m.status === "Needs Invoice"
                        ? "bg-amber-500/5 border-amber-500/20"
                        : "bg-red-500/5 border-red-500/20"
                    }`}
                  >
                    <div>
                      <div className={`font-bold text-sm ${m.status === "Needs Invoice" ? "text-amber-500" : "text-red-500"}`}>
                        {m.projectName} - {m.name}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{m.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-foreground">RM {m.amount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
