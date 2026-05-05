"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Receipt, FileText, ArrowUpRight, Wallet, Loader2, Download } from "lucide-react";
import Link from "next/link";
import { SearchFilter } from "@/components/SearchFilter";
import { Pagination } from "@/components/Pagination";
import { toast } from "sonner";
import type { Invoice, Quotation, PaginatedResponse } from "@/types";

interface ReceiptRow {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentMethod: string | null;
  paymentDate: string;
  clientName: string | null;
  invoiceNumber: string;
  invoiceId: string;
  projectName: string | null;
}

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState<"invoices" | "quotations" | "receipts">("invoices");

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoicePage, setInvoicePage] = useState(1);
  const [invoiceTotalPages, setInvoiceTotalPages] = useState(1);
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatus, setInvoiceStatus] = useState("");

  // Quotation state
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [quotationPage, setQuotationPage] = useState(1);
  const [quotationTotalPages, setQuotationTotalPages] = useState(1);
  const [quotationSearch, setQuotationSearch] = useState("");
  const [quotationStatus, setQuotationStatus] = useState("");

  // Receipt state
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [receiptPage, setReceiptPage] = useState(1);
  const [receiptTotalPages, setReceiptTotalPages] = useState(1);
  const [receiptLoading, setReceiptLoading] = useState(false);

  // Summary stats (fetched once from first page without filters)
  const [stats, setStats] = useState({ revenueYtd: 0, pendingCount: 0, pendingTotal: 0, paidCount: 0, draftQuotations: 0, totalQuotations: 0 });

  const [loading, setLoading] = useState(true);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [quotationLoading, setQuotationLoading] = useState(false);

  // Fetch summary stats once
  useEffect(() => {
    Promise.all([
      fetch("/api/invoices?page=1&limit=999").then((r) => r.json()),
      fetch("/api/quotations?page=1&limit=999").then((r) => r.json()),
    ])
      .then(([invRes, quotRes]) => {
        const allInv: Invoice[] = invRes.data ?? (Array.isArray(invRes) ? invRes : []);
        const allQuot: Quotation[] = quotRes.data ?? (Array.isArray(quotRes) ? quotRes : []);

        const revenueYtd = allInv.filter((i) => i.status === "Paid").reduce((s, i) => s + i.amount, 0);
        const pending = allInv.filter((i) => i.status === "Draft" || i.status === "Sent");
        const pendingTotal = pending.reduce((s, i) => s + i.amount, 0);
        const paidCount = allInv.filter((i) => i.status === "Paid").length;
        const draftQuotations = allQuot.filter((q) => q.status === "Draft").length;

        setStats({
          revenueYtd,
          pendingCount: pending.length,
          pendingTotal,
          paidCount,
          draftQuotations,
          totalQuotations: allQuot.length,
        });
      })
      .catch(() => toast.error("Failed to load summary stats"))
      .finally(() => setLoading(false));
  }, []);

  // Fetch invoices with pagination/search/status
  const fetchInvoices = useCallback(async () => {
    setInvoiceLoading(true);
    try {
      const params = new URLSearchParams({ page: String(invoicePage), limit: "10" });
      if (invoiceSearch) params.set("search", invoiceSearch);
      if (invoiceStatus) params.set("status", invoiceStatus);
      const res = await fetch(`/api/invoices?${params}`);
      const data: PaginatedResponse<Invoice> = await res.json();
      setInvoices(data.data ?? (Array.isArray(data) ? data : []));
      setInvoiceTotalPages(data.totalPages ?? 1);
    } catch {
      toast.error("Failed to load invoices");
    } finally {
      setInvoiceLoading(false);
    }
  }, [invoicePage, invoiceSearch, invoiceStatus]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Fetch quotations with pagination/search/status
  const fetchQuotations = useCallback(async () => {
    setQuotationLoading(true);
    try {
      const params = new URLSearchParams({ page: String(quotationPage), limit: "10" });
      if (quotationSearch) params.set("search", quotationSearch);
      if (quotationStatus) params.set("status", quotationStatus);
      const res = await fetch(`/api/quotations?${params}`);
      const data: PaginatedResponse<Quotation> = await res.json();
      setQuotations(data.data ?? (Array.isArray(data) ? data : []));
      setQuotationTotalPages(data.totalPages ?? 1);
    } catch {
      toast.error("Failed to load quotations");
    } finally {
      setQuotationLoading(false);
    }
  }, [quotationPage, quotationSearch, quotationStatus]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  // Fetch receipts with pagination
  const fetchReceipts = useCallback(async () => {
    setReceiptLoading(true);
    try {
      const params = new URLSearchParams({ page: String(receiptPage), limit: "10" });
      const res = await fetch(`/api/receipts?${params}`);
      const data = await res.json();
      setReceipts(data.data ?? []);
      setReceiptTotalPages(data.totalPages ?? 1);
    } catch {
      toast.error("Failed to load receipts");
    } finally {
      setReceiptLoading(false);
    }
  }, [receiptPage]);

  useEffect(() => {
    if (activeTab === "receipts") fetchReceipts();
  }, [fetchReceipts, activeTab]);

  // Reset page when search/status changes
  const handleInvoiceSearch = useCallback((s: string) => {
    setInvoiceSearch(s);
    setInvoicePage(1);
  }, []);
  const handleInvoiceStatus = useCallback((s: string) => {
    setInvoiceStatus(s);
    setInvoicePage(1);
  }, []);
  const handleQuotationSearch = useCallback((s: string) => {
    setQuotationSearch(s);
    setQuotationPage(1);
  }, []);
  const handleQuotationStatus = useCallback((s: string) => {
    setQuotationStatus(s);
    setQuotationPage(1);
  }, []);

  // Export CSV handlers
  const handleExportInvoices = async () => {
    try {
      const res = await fetch("/api/invoices/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoices-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Invoices exported successfully");
    } catch {
      toast.error("Failed to export invoices");
    }
  };

  const handleExportQuotations = async () => {
    try {
      const res = await fetch("/api/quotations/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quotations-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Quotations exported successfully");
    } catch {
      toast.error("Failed to export quotations");
    }
  };

  // Overdue check helper
  const isOverdue = (inv: Invoice) => {
    if (inv.status === "Paid" || inv.status === "Void") return false;
    if (!inv.due_date) return false;
    return new Date(inv.due_date) < new Date();
  };

  const invoiceStatusColor: Record<string, string> = {
    Draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    Sent: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    Paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Void: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const quotationStatusColor: Record<string, string> = {
    Draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    Sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    Accepted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const invoiceStatusOptions = [
    { label: "Draft", value: "Draft" },
    { label: "Sent", value: "Sent" },
    { label: "Paid", value: "Paid" },
    { label: "Void", value: "Void" },
  ];

  const quotationStatusOptions = [
    { label: "Draft", value: "Draft" },
    { label: "Sent", value: "Sent" },
    { label: "Accepted", value: "Accepted" },
    { label: "Rejected", value: "Rejected" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Billing & Finance</h1>
          <p className="text-muted-foreground mt-1">Track revenue, quotations, and invoices.</p>
        </div>
        <div className="flex gap-3">
          <Link href="/billing/quotations/new">
            <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5">
              <Plus className="h-4 w-4" /> New Quotation
            </Button>
          </Link>
          <Link href="/billing/invoices/new">
            <Button className="gap-2 shadow-lg shadow-primary/25">
              <Plus className="h-4 w-4" /> New Invoice
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-xl group-hover:bg-primary/20 transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Revenue (YTD)</CardTitle>
            <Wallet className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-black text-foreground">RM {stats.revenueYtd.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</div>
            {!loading && <p className="text-xs text-emerald-500 font-bold mt-1 inline-flex items-center bg-emerald-500/10 px-2 py-0.5 rounded-full">Paid</p>}
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-amber-500/10 blur-xl group-hover:bg-amber-500/20 transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-black text-foreground">{stats.pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Total: RM {stats.pendingTotal.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/10 blur-xl group-hover:bg-blue-500/20 transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Draft Quotations</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-black text-foreground">{stats.draftQuotations}</div>
            <p className="text-xs text-muted-foreground mt-1">Total: {stats.totalQuotations}</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-emerald-500/10 blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Paid Invoices</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-black text-foreground">{stats.paidCount}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex border-b border-border/50">
          <button
            onClick={() => setActiveTab("invoices")}
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === "invoices" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Recent Invoices
          </button>
          <button
            onClick={() => setActiveTab("quotations")}
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === "quotations" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Quotations
          </button>
          <button
            onClick={() => setActiveTab("receipts")}
            className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === "receipts" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Receipts
          </button>
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && activeTab === "invoices" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-left-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex-1 w-full">
                <SearchFilter
                  placeholder="Search invoices..."
                  statusOptions={invoiceStatusOptions}
                  onSearch={handleInvoiceSearch}
                  onStatusChange={handleInvoiceStatus}
                  currentSearch={invoiceSearch}
                  currentStatus={invoiceStatus}
                />
              </div>
              <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 shrink-0" onClick={handleExportInvoices}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>

            <Card className="border-primary/20 bg-card/50 backdrop-blur-md">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-base">Invoices</CardTitle>
              </CardHeader>
              {invoiceLoading ? (
                <CardContent className="p-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              ) : invoices.length === 0 ? (
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No invoices found.</p>
                </CardContent>
              ) : (
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/50 text-xs uppercase font-bold tracking-wider text-muted-foreground">
                        <th className="px-6 py-3 text-left">Invoice #</th>
                        <th className="px-6 py-3 text-left">Project</th>
                        <th className="px-6 py-3 text-left">Type</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                        <th className="px-6 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {invoices.map((inv) => (
                        <tr
                          key={inv.id}
                          onClick={() => window.location.href = `/billing/invoices/${inv.id}`}
                          className={`hover:bg-secondary/30 transition-colors cursor-pointer ${isOverdue(inv) ? "border-l-4 border-l-red-500" : ""}`}
                        >
                          <td className="px-6 py-3 font-mono font-bold text-primary">{inv.invoice_number}</td>
                          <td className="px-6 py-3 text-muted-foreground">{inv.project_name ?? "-"}</td>
                          <td className="px-6 py-3">{inv.type}</td>
                          <td className="px-6 py-3 text-right font-bold">RM {inv.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${invoiceStatusColor[inv.status] ?? ""}`}>
                              {inv.status}
                            </span>
                            {isOverdue(inv) && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                                Overdue
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>

            <Pagination page={invoicePage} totalPages={invoiceTotalPages} onPageChange={setInvoicePage} />
          </div>
        )}

        {!loading && activeTab === "quotations" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex-1 w-full">
                <SearchFilter
                  placeholder="Search quotations..."
                  statusOptions={quotationStatusOptions}
                  onSearch={handleQuotationSearch}
                  onStatusChange={handleQuotationStatus}
                  currentSearch={quotationSearch}
                  currentStatus={quotationStatus}
                />
              </div>
              <Button variant="outline" className="gap-2 border-primary/20 hover:bg-primary/5 shrink-0" onClick={handleExportQuotations}>
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </div>

            <Card className="border-primary/20 bg-card/50 backdrop-blur-md">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-base">Quotations</CardTitle>
              </CardHeader>
              {quotationLoading ? (
                <CardContent className="p-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              ) : quotations.length === 0 ? (
                <CardContent className="p-8 text-center text-muted-foreground">
                  <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No quotations found.</p>
                </CardContent>
              ) : (
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/50 text-xs uppercase font-bold tracking-wider text-muted-foreground">
                        <th className="px-6 py-3 text-left">Quotation #</th>
                        <th className="px-6 py-3 text-left">Client</th>
                        <th className="px-6 py-3 text-right">Total</th>
                        <th className="px-6 py-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {quotations.map((q) => (
                        <tr
                          key={q.id}
                          onClick={() => window.location.href = `/billing/quotations/${q.id}`}
                          className="hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-3 font-mono font-bold text-primary hover:underline">{q.quotation_number}</td>
                          <td className="px-6 py-3 text-muted-foreground">{q.client_name}</td>
                          <td className="px-6 py-3 text-right font-bold">RM {q.total_amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase border ${quotationStatusColor[q.status] ?? ""}`}>
                              {q.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>

            <Pagination page={quotationPage} totalPages={quotationTotalPages} onPageChange={setQuotationPage} />
          </div>
        )}

        {!loading && activeTab === "receipts" && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <Card className="border-primary/20 bg-card/50 backdrop-blur-md">
              <CardHeader className="border-b border-border/50">
                <CardTitle className="text-base">All Receipts</CardTitle>
              </CardHeader>
              {receiptLoading ? (
                <CardContent className="p-8 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </CardContent>
              ) : receipts.length === 0 ? (
                <CardContent className="p-8 text-center text-muted-foreground">
                  <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No receipts yet.</p>
                </CardContent>
              ) : (
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-secondary/50 text-xs uppercase font-bold tracking-wider text-muted-foreground">
                        <th className="px-6 py-3 text-left">Receipt #</th>
                        <th className="px-6 py-3 text-left">Client</th>
                        <th className="px-6 py-3 text-left">Invoice</th>
                        <th className="px-6 py-3 text-left">Date</th>
                        <th className="px-6 py-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {receipts.map((r) => (
                        <tr
                          key={r.id}
                          onClick={() => window.location.href = `/billing/receipts/${r.id}`}
                          className="hover:bg-secondary/30 transition-colors cursor-pointer"
                        >
                          <td className="px-6 py-3 font-mono font-bold text-primary">{r.receiptNumber}</td>
                          <td className="px-6 py-3 text-muted-foreground">{r.clientName ?? "-"}</td>
                          <td className="px-6 py-3 text-muted-foreground">{r.invoiceNumber}</td>
                          <td className="px-6 py-3 text-muted-foreground">{new Date(r.paymentDate).toLocaleDateString("en-MY")}</td>
                          <td className="px-6 py-3 text-right font-bold text-emerald-500">RM {r.amountPaid.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              )}
            </Card>
            <Pagination page={receiptPage} totalPages={receiptTotalPages} onPageChange={setReceiptPage} />
          </div>
        )}
      </div>
    </div>
  );
}
