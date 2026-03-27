"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Download, Loader2, CheckCircle2, XCircle, Send, Copy, Pencil, FileText, ArrowRight } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PdfDocument } from "@/lib/pdf-generator";
import { Quotation } from "@/types";
import { toast } from "sonner";

const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <Button disabled className="w-full">Loading Document...</Button>,
    }
);

export default function QuotationViewPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = React.use(params);
    const [quotation, setQuotation] = useState<Quotation | null>(null);
    const [companyDetails, setCompanyDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [converting, setConverting] = useState(false);
    const [duplicating, setDuplicating] = useState(false);

    useEffect(() => {
        if (!id) return;
        Promise.all([
            fetch(`/api/quotations/${id}`).then((res) => res.json()),
            fetch(`/api/settings`).then((res) => res.json()),
        ]).then(([quoteData, settingsData]) => {
            if (quoteData && !quoteData.error) {
                setQuotation(quoteData);
            }
            if (settingsData && !settingsData.error) {
                setCompanyDetails(settingsData);
            }
            setLoading(false);
        }).catch((err) => {
            console.error("Error fetching data:", err);
            toast.error("Failed to load quotation data");
            setLoading(false);
        });
    }, [id]);

    const updateStatus = async (newStatus: "Sent" | "Accepted" | "Rejected") => {
        if (!quotation) return;
        setUpdating(true);
        try {
            const res = await fetch(`/api/quotations/${quotation.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (res.ok) {
                const updated = await res.json();
                setQuotation(updated);
                toast.success(`Quotation marked as ${newStatus}`);
            } else {
                const err = await res.json().catch(() => null);
                toast.error(err?.error || `Failed to update status to ${newStatus}`);
            }
        } catch {
            toast.error("Network error — could not update status");
        } finally {
            setUpdating(false);
        }
    };

    const handleConvertToInvoice = async () => {
        if (!quotation) return;
        setConverting(true);
        try {
            const res = await fetch(`/api/quotations/${quotation.id}/convert`, {
                method: "POST",
            });
            if (res.ok) {
                const data = await res.json();
                toast.success("Quotation converted to invoice");
                router.push(`/billing/invoices/${data.id}`);
            } else {
                const err = await res.json().catch(() => null);
                toast.error(err?.error || "Failed to convert to invoice");
            }
        } catch {
            toast.error("Network error — could not convert to invoice");
        } finally {
            setConverting(false);
        }
    };

    const handleDuplicate = async () => {
        if (!quotation) return;
        setDuplicating(true);
        try {
            const res = await fetch(`/api/quotations/${quotation.id}/duplicate`, {
                method: "POST",
            });
            if (res.ok) {
                const data = await res.json();
                toast.success("Quotation duplicated");
                router.push(`/billing/quotations/${data.id}`);
            } else {
                const err = await res.json().catch(() => null);
                toast.error(err?.error || "Failed to duplicate quotation");
            }
        } catch {
            toast.error("Network error — could not duplicate quotation");
        } finally {
            setDuplicating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!quotation) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <h2 className="text-2xl font-bold">Quotation Not Found</h2>
                <Button onClick={() => router.push("/billing")}>Return to Billing</Button>
            </div>
        );
    }

    const pdfData = {
        number: quotation.quotation_number,
        clientName: quotation.client_name,
        clientEmail: quotation.client_email || "",
        clientBrn: quotation.client_brn || "",
        items: quotation.items,
        total: quotation.total_amount,
        notes: quotation.notes || "",
    };

    const statusColors = {
        Draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
        Sent: "bg-blue-500/10 text-blue-500 border-blue-500/20",
        Accepted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
        Rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
            <div className="flex items-center gap-4">
                <Link href="/billing">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">{quotation.quotation_number}</h1>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border ${statusColors[quotation.status]}`}>
                            {quotation.status}
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Created {new Date(quotation.created_at).toLocaleDateString()}
                        {quotation.updated_at && quotation.updated_at !== quotation.created_at && (
                            <span className="ml-2">
                                &middot; Updated {new Date(quotation.updated_at).toLocaleDateString()}
                            </span>
                        )}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Client Details</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Name:</span>
                                <span className="font-medium text-foreground">{quotation.client_name}</span>
                            </div>
                            {quotation.client_email && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="font-medium text-foreground">{quotation.client_email}</span>
                                </div>
                            )}
                            {quotation.client_brn && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">BRN:</span>
                                    <span className="font-medium text-foreground">{quotation.client_brn}</span>
                                </div>
                            )}
                            {quotation.valid_until && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Valid Until:</span>
                                    <span className="font-medium text-foreground">{new Date(quotation.valid_until).toLocaleDateString()}</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

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
                                    {quotation.items.map((item, idx) => (
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
                                        <td colSpan={3} className="py-4 text-right font-medium text-muted-foreground">Grand Total</td>
                                        <td className="py-4 text-right text-xl font-black text-foreground">RM {quotation.total_amount.toLocaleString("en-MY", { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </CardContent>
                    </Card>

                    {quotation.notes && (
                        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                            <CardHeader className="border-b border-border/50 pb-4">
                                <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Notes / Terms</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6">
                                <p className="text-sm whitespace-pre-wrap text-muted-foreground">{quotation.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 sticky top-6">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Actions</CardTitle>
                            <CardDescription>Manage this document</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-3">
                            <PDFDownloadLink
                                document={<PdfDocument type="Quotation" data={pdfData} companyDetails={companyDetails} />}
                                fileName={`Quotation_${quotation.quotation_number}.pdf`}
                            >
                                {({ loading: pdfLoading }) => (
                                    <Button className="w-full gap-2 shadow-lg shadow-primary/25" disabled={pdfLoading}>
                                        <Download className="h-4 w-4" />
                                        {pdfLoading ? "Generating..." : "Download PDF"}
                                    </Button>
                                )}
                            </PDFDownloadLink>

                            {quotation.status === "Draft" && (
                                <Link href={`/billing/quotations/${quotation.id}/edit`} className="block">
                                    <Button variant="outline" className="w-full justify-start border-primary/20 hover:bg-primary/5">
                                        <Pencil className="mr-2 h-4 w-4" /> Edit Quotation
                                    </Button>
                                </Link>
                            )}

                            <Button
                                variant="outline"
                                className="w-full justify-start border-primary/20 hover:bg-primary/5"
                                disabled={duplicating}
                                onClick={handleDuplicate}
                            >
                                {duplicating ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Duplicating...</>
                                ) : (
                                    <><Copy className="mr-2 h-4 w-4" /> Duplicate</>
                                )}
                            </Button>

                            {quotation.status === "Accepted" && (
                                <Button
                                    className="w-full justify-start gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25"
                                    disabled={converting}
                                    onClick={handleConvertToInvoice}
                                >
                                    {converting ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Converting...</>
                                    ) : (
                                        <><FileText className="mr-2 h-4 w-4" /> Convert to Invoice <ArrowRight className="ml-auto h-4 w-4" /></>
                                    )}
                                </Button>
                            )}

                            <div className="pt-4 border-t border-border/50 space-y-2">
                                <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Update Status</p>

                                {quotation.status === "Draft" && (
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start text-blue-500 hover:text-blue-600 hover:bg-blue-50 border-blue-200"
                                        disabled={updating}
                                        onClick={() => updateStatus("Sent")}
                                    >
                                        <Send className="mr-2 h-4 w-4" /> Mark as Sent
                                    </Button>
                                )}

                                {quotation.status === "Sent" && (
                                    <>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 border-emerald-200"
                                            disabled={updating}
                                            onClick={() => updateStatus("Accepted")}
                                        >
                                            <CheckCircle2 className="mr-2 h-4 w-4" /> Mark Accepted
                                        </Button>
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
                                            disabled={updating}
                                            onClick={() => updateStatus("Rejected")}
                                        >
                                            <XCircle className="mr-2 h-4 w-4" /> Mark Rejected
                                        </Button>
                                    </>
                                )}

                                {(quotation.status === "Accepted" || quotation.status === "Rejected") && (
                                    <p className="text-sm text-muted-foreground text-center italic py-2">
                                        This quotation has been finalised.
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
