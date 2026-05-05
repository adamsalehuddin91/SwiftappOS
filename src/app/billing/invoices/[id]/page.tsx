"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ArrowLeft, Download, Loader2, CheckCircle2, WalletCards, Send,
  Pencil, Ban, CreditCard, Clock, ExternalLink, User, Mail, Hash,
  FileText, Calendar, AlertTriangle, TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { PdfDocument } from "@/lib/pdf-generator";
import { INVOICE_TC } from "@/lib/billing-presets";
import { Invoice, Receipt } from "@/types";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <Button disabled className="w-full">Loading Document...</Button>,
  }
);

export default function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = React.use(params);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Payment dialog
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [recordingPayment, setRecordingPayment] = useState(false);

  // Void confirm
  const [voidConfirm, setVoidConfirm] = useState(false);

  const fetchInvoice = useCallback(async () => {
    try {
      const [invRes, settingsRes] = await Promise.all([
        fetch(`/api/invoices/${id}`),
        fetch("/api/settings"),
      ]);
      const invData = await invRes.json();
      const settingsData = await settingsRes.json();

      if (invData && !invData.error) {
        setInvoice(invData);
        const receiptsTotal = (invData.receipts ?? []).reduce((s: number, r: Receipt) => s + r.amountPaid, 0);
        setPaymentAmount(invData.amount - receiptsTotal);
      }
      if (settingsData && !settingsData.error) setCompanyDetails(settingsData);
    } catch {
      toast.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const updateStatus = async (newStatus: "Sent" | "Void") => {
    if (!invoice) return;
    setUpdating(true);
    setVoidConfirm(false);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setInvoice(updated);
        toast.success(`Invoice marked as ${newStatus}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || `Failed to update status`);
      }
    } catch {
      toast.error("Failed to update invoice status");
    } finally {
      setUpdating(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice || paymentAmount <= 0) return;
    setRecordingPayment(true);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/receipts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: paymentAmount, paymentMethod, paymentDate }),
        // API at /api/invoices/[id]/receipts accepts { amount, paymentMethod, paymentDate }
      });
      if (res.ok) {
        const updatedRes = await fetch(`/api/invoices/${invoice.id}`);
        if (updatedRes.ok) {
          const updated = await updatedRes.json();
          setInvoice(updated);
          const newTotal = (updated.receipts ?? []).reduce((s: number, r: Receipt) => s + r.amountPaid, 0);
          setPaymentAmount(updated.amount - newTotal);
        }
        setPaymentOpen(false);
        toast.success("Payment recorded successfully");
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to record payment");
      }
    } catch {
      toast.error("Failed to record payment");
    } finally {
      setRecordingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
        <h2 className="text-2xl font-bold">Invoice Not Found</h2>
        <Button onClick={() => router.push("/billing")}>Return to Billing</Button>
      </div>
    );
  }

  const receipts: Receipt[] = invoice.receipts ?? [];
  const receiptsTotal = receipts.reduce((s, r) => s + r.amountPaid, 0);
  const remainingBalance = invoice.amount - receiptsTotal;

  const pdfData = {
    number: invoice.invoice_number,
    clientName: invoice.client_name || "Valued Client",
    clientEmail: invoice.client_email || "",
    clientBrn: invoice.client_brn || "",
    items: invoice.items && invoice.items.length > 0
      ? invoice.items
      : [{ description: `${invoice.project_name ?? ""} - ${invoice.type} Billing`, quantity: 1, unitPrice: invoice.amount }],
    total: invoice.amount,
    notes: INVOICE_TC,
  };

  const statusColors: Record<string, string> = {
    Draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    Sent: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    Paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    Void: "bg-red-500/10 text-red-500 border-red-500/20",
  };

  const canMarkSent = invoice.status === "Draft";
  const canRecordPayment = invoice.status === "Draft" || invoice.status === "Sent";
  const canVoid = invoice.status === "Draft" || invoice.status === "Sent";
  const canEdit = invoice.status === "Draft";
  const isSettled = invoice.status === "Paid" || invoice.status === "Void";

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black tracking-tight text-foreground">{invoice.invoice_number}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${statusColors[invoice.status]}`}>
              {invoice.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Generated on {new Date(invoice.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">

          {/* Invoice Details */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Billing Stage</p>
                  <p className="font-semibold text-foreground">{invoice.type}</p>
                </div>
                {invoice.project_name && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Project</p>
                    <p className="font-semibold text-foreground">{invoice.project_name}</p>
                  </div>
                )}
                {invoice.due_date && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Due Date</p>
                    <p className="font-semibold text-foreground flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      {new Date(invoice.due_date).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Amount</p>
                  <p className="text-xl font-black text-foreground">RM {invoice.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</p>
                </div>
              </div>

              {/* Client info */}
              {(invoice.client_name || invoice.client_email || invoice.client_brn) && (
                <div className="pt-4 border-t border-border/30 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Client</p>
                  <div className="space-y-1.5">
                    {invoice.client_name && (
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="font-semibold text-foreground">{invoice.client_name}</span>
                      </div>
                    )}
                    {invoice.client_email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">{invoice.client_email}</span>
                      </div>
                    )}
                    {invoice.client_brn && (
                      <div className="flex items-center gap-2 text-sm">
                        <Hash className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        <span className="text-muted-foreground">BRN: {invoice.client_brn}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {invoice.notes && (
                <div className="pt-4 border-t border-border/30">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Line Items</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 text-xs uppercase font-bold tracking-wider text-muted-foreground">
                    <th className="py-4 text-left">Description</th>
                    <th className="py-4 text-center">Qty</th>
                    <th className="py-4 text-right">Price (RM)</th>
                    <th className="py-4 text-right">Total (RM)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {(invoice.items && invoice.items.length > 0
                    ? invoice.items
                    : [{ description: `${invoice.type} Billing`, quantity: 1, unitPrice: invoice.amount }]
                  ).map((item, idx) => (
                    <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                      <td className="py-3 font-medium">{item.description}</td>
                      <td className="py-3 text-center text-muted-foreground">{item.quantity}</td>
                      <td className="py-3 text-right text-muted-foreground">{item.unitPrice.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 text-right font-medium">{(item.quantity * item.unitPrice).toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border/50">
                    <td colSpan={3} className="py-4 text-right font-medium text-muted-foreground">Total Due</td>
                    <td className="py-4 text-right text-xl font-black text-foreground">RM {invoice.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
                  </tr>
                  {receipts.length > 0 && (
                    <>
                      <tr className="border-t border-border/30">
                        <td colSpan={3} className="py-2 text-right font-medium text-emerald-500">Total Paid</td>
                        <td className="py-2 text-right font-bold text-emerald-500">RM {receiptsTotal.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="py-2 text-right font-medium text-muted-foreground">Remaining Balance</td>
                        <td className={`py-2 text-right font-black text-lg ${remainingBalance > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                          RM {remainingBalance.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </CardContent>
          </Card>

          {/* Payment History */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-border/50 pb-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Payment History</CardTitle>
                  <CardDescription>{receipts.length} payment(s) recorded</CardDescription>
                </div>
                {receipts.length > 0 && invoice.status !== "Paid" && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border bg-amber-500/10 text-amber-500 border-amber-500/20">
                    Partial
                  </span>
                )}
              </div>
              {receipts.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> RM {receiptsTotal.toLocaleString("en-MY", { minimumFractionDigits: 2 })} paid</span>
                    <span>RM {invoice.amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })} total</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${receiptsTotal >= invoice.amount ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min((receiptsTotal / invoice.amount) * 100, 100)}%` }}
                    />
                  </div>
                  {remainingBalance > 0 && (
                    <p className="text-xs text-amber-500 font-semibold">RM {remainingBalance.toLocaleString("en-MY", { minimumFractionDigits: 2 })} remaining</p>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {receipts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <CreditCard className="h-10 w-10 mx-auto mb-3 opacity-20" />
                  <p>No payments recorded yet.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-xs uppercase font-bold tracking-wider text-muted-foreground">
                      <th className="py-4 text-left">Receipt #</th>
                      <th className="py-4 text-left">Method</th>
                      <th className="py-4 text-left">Date</th>
                      <th className="py-4 text-right">Amount (RM)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {receipts.map((receipt) => (
                      <tr key={receipt.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="py-3">
                          <Link
                            href={`/billing/receipts/${receipt.id}`}
                            className="font-mono font-bold text-primary hover:underline flex items-center gap-1"
                          >
                            {receipt.receiptNumber}
                            <ExternalLink className="h-3 w-3 opacity-50" />
                          </Link>
                        </td>
                        <td className="py-3 text-muted-foreground">{receipt.paymentMethod ?? "-"}</td>
                        <td className="py-3 text-muted-foreground">{new Date(receipt.paymentDate).toLocaleDateString()}</td>
                        <td className="py-3 text-right font-bold text-emerald-500">
                          {receipt.amountPaid.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          {invoice.updated_at && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <Clock className="h-3 w-3" />
              <span>Last updated: {new Date(invoice.updated_at).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 sticky top-6">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Actions</CardTitle>
              <CardDescription>Manage this invoice</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {/* PDF Download */}
              <PDFDownloadLink
                document={<PdfDocument type="Invoice" data={pdfData} companyDetails={companyDetails} />}
                fileName={`${invoice.invoice_number}.pdf`}
              >
                {({ loading: pdfLoading }) => (
                  <Button className="w-full gap-2 shadow-lg shadow-primary/25" disabled={pdfLoading}>
                    <Download className="h-4 w-4" />
                    {pdfLoading ? "Generating..." : "Download PDF"}
                  </Button>
                )}
              </PDFDownloadLink>

              {/* Edit — Draft only */}
              {canEdit && (
                <Link href={`/billing/invoices/${invoice.id}/edit`} className="block">
                  <Button variant="outline" className="w-full justify-start gap-2 border-primary/20 hover:bg-primary/5">
                    <Pencil className="h-4 w-4" /> Edit Invoice
                  </Button>
                </Link>
              )}

              {/* Status actions */}
              {!isSettled && (
                <div className="pt-4 border-t border-border/50 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Update Status</p>

                  {canMarkSent && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 border-amber-200"
                      disabled={updating}
                      onClick={() => updateStatus("Sent")}
                    >
                      <Send className="h-4 w-4" /> Mark as Sent
                    </Button>
                  )}

                  {canRecordPayment && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                      disabled={updating}
                      onClick={() => {
                        setPaymentAmount(remainingBalance > 0 ? remainingBalance : invoice.amount);
                        setPaymentDate(new Date().toISOString().slice(0, 10));
                        setPaymentMethod("Bank Transfer");
                        setPaymentOpen(true);
                      }}
                    >
                      <WalletCards className="h-4 w-4" /> Record Payment
                    </Button>
                  )}

                  {canVoid && !voidConfirm && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                      disabled={updating}
                      onClick={() => setVoidConfirm(true)}
                    >
                      <Ban className="h-4 w-4" /> Void Invoice
                    </Button>
                  )}

                  {/* Inline void confirm */}
                  {voidConfirm && (
                    <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-2">
                      <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Void invoice? This cannot be undone.
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 text-xs border-border/50"
                          onClick={() => setVoidConfirm(false)}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs bg-red-500 hover:bg-red-600 text-white border-0"
                          disabled={updating}
                          onClick={() => updateStatus("Void")}
                        >
                          {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Yes, Void"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isSettled && (
                <p className="text-sm text-muted-foreground text-center italic py-2">
                  This invoice has been {invoice.status.toLowerCase()}.
                </p>
              )}

              <Link href="/billing" className="block pt-1">
                <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground gap-2">
                  <FileText className="h-4 w-4" /> Back to Billing
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="border-primary/20 bg-card">
          <DialogHeader>
            <DialogTitle className="font-bold uppercase tracking-wider">Record Payment</DialogTitle>
            <DialogDescription>
              {invoice.invoice_number} — Remaining: RM {remainingBalance.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                Amount (RM)
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                step="0.01"
                min="0.01"
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                placeholder="Enter payment amount"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cash">Cash</option>
                <option value="Cheque">Cheque</option>
                <option value="Online">Online</option>
                <option value="DuitNow">DuitNow</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2 block">
                Payment Date
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentOpen(false)} disabled={recordingPayment}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordPayment}
              disabled={recordingPayment || paymentAmount <= 0}
              className="gap-2 shadow-lg shadow-primary/25"
            >
              {recordingPayment ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Recording...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Record Payment</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
