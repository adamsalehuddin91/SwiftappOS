
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowUpRight, ArrowDownRight, DollarSign, Bell } from "lucide-react";

export default function AnalyticsPage() {
    // Mock Data
    const revenueData = [
        { month: "Jan", amount: 12000 },
        { month: "Feb", amount: 15000 },
        { month: "Mar", amount: 8000 },
        { month: "Apr", amount: 22000 },
        { month: "May", amount: 18000 },
        { month: "Jun", amount: 25000 },
    ];

    const maxRevenue = Math.max(...revenueData.map(d => d.amount));

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Cashflow & Analytics</h1>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Net Profit (YTD)</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">RM 85,400.00</div>
                        <p className="text-xs text-muted-foreground">+12% from last year</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Incoming (Pending)</CardTitle>
                        <ArrowDownRight className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">RM 12,500.00</div>
                        <div className="text-xs text-muted-foreground mt-1">
                            <span className="text-green-600 font-medium">3 Invoices</span> due soon
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Expenses (YTD)</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">RM 4,200.00</div>
                        <p className="text-xs text-muted-foreground">Server costs & subscriptions</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Revenue Overview</CardTitle>
                        <CardDescription>Monthly revenue for the current year.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="h-[200px] flex items-end gap-2 mt-4 space-x-2">
                            {revenueData.map((data) => (
                                <div key={data.month} className="flex-1 flex flex-col items-center gap-2 group">
                                    <div
                                        className="w-full bg-slate-900 rounded-t-md transition-all group-hover:bg-slate-700 relative"
                                        style={{ height: `${(data.amount / maxRevenue) * 100}%` }}
                                    >
                                    </div>
                                    <span className="text-xs text-muted-foreground">{data.month}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            Pending Milestones
                        </CardTitle>
                        <CardDescription>Action needed: Invoicing or Payments.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                                <div>
                                    <div className="font-medium text-yellow-900">E-Commerce Revamp - Progress</div>
                                    <div className="text-xs text-yellow-700">Milestone completed 2 days ago.</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-yellow-900">RM 2,500</div>
                                    <button className="text-xs font-bold text-yellow-800 hover:underline">Generate Invoice</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                                <div>
                                    <div className="font-medium text-red-900">Internal HR Portal - Deposit</div>
                                    <div className="text-xs text-red-700">Invoice #INV-2023-005 overdue by 5 days.</div>
                                </div>
                                <div className="text-right">
                                    <div className="font-medium text-red-900">RM 5,000</div>
                                    <button className="text-xs font-bold text-red-800 hover:underline">Send Reminder</button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
