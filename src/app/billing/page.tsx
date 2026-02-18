
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Receipt, FileText, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function BillingPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Swift Billing</h1>
                <div className="flex gap-2">
                    <Link href="/billing/quotations/new">
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" /> New Quotation
                        </Button>
                    </Link>
                    <Link href="/billing/invoices/new">
                        <Button variant="outline" className="gap-2">
                            <Plus className="h-4 w-4" /> New Invoice
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Revenue (YTD)</CardTitle>
                        <div className="h-4 w-4 text-muted-foreground">RM</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">RM 45,231.89</div>
                        <p className="text-xs text-muted-foreground">+20.1% from last month</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
                        <Receipt className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">3</div>
                        <p className="text-xs text-muted-foreground">Total: RM 12,500.00</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Draft Quotations</CardTitle>
                        <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">2</div>
                        <p className="text-xs text-muted-foreground">Potential: RM 8,000.00</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Paid Milestones</CardTitle>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12</div>
                        <p className="text-xs text-muted-foreground">Last payment: 2 days ago</p>
                    </CardContent>
                </Card>
            </div>

            <div className="tabs">
                <div className="flex border-b">
                    <button className="border-b-2 border-slate-900 px-4 py-2 font-medium text-sm">Recent Invoices</button>
                    <button className="px-4 py-2 font-medium text-sm text-muted-foreground hover:text-slate-900">Quotations</button>
                </div>
                <div className="py-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Invoices</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-sm text-muted-foreground">No recent invoices found.</div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
