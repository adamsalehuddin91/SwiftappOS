"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Download, Loader2, Receipt as ReceiptIcon, FileText, Calendar, CreditCard, Hash } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { PdfDocument } from "@/lib/pdf-generator";

const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <Button disabled className="w-full gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading...</Button>,
    }
);

interface ReceiptData {
    id: string;
    receiptNumber: string;
    amountPaid: number;
    paymentMethod?: string;
    paymentDate: string;
    invoiceId: string;
    created_at: string;
    invoice?: {
        id: string;
        invoiceNumber: string;
        amount: number;
        projectName: string;
    };
}

export default function ReceiptViewPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = React.use(params);
    const [receipt, setReceipt] = useState<ReceiptData | null>(null);
    const [companyDetails, setCompanyDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        Promise.all([
            fetch(`/api/receipts/${id}`).then((res) => {
                if (!res.ok) throw new Error("Not found");
                return res.json();
            }),
            fetch("/api/settings").then((r) => r.json()),
        ])
            .then(([data, settings]) => {
                setReceipt(data);
                setCompanyDetails(settings);
                setLoading(false);
            })
            .catch(() => {
                toast.error("Failed to load receipt");
                setLoading(false);
            });
    }, [id]);

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!receipt) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
                <h2 className="text-2xl font-bold">Receipt Not Found</h2>
                <Button onClick={() => router.push("/billing")}>Return to Billing</Button>
            </div>
        );
    }

    const pdfData = {
        receiptNumber: receipt.receiptNumber,
        invoiceNumber: receipt.invoice?.invoiceNumber ?? "-",
        paymentMethod: receipt.paymentMethod ?? "Bank Transfer",
        paymentDate: new Date(receipt.paymentDate).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" }),
        projectName: receipt.invoice?.projectName ?? "-",
        amountPaid: receipt.amountPaid,
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-3xl mx-auto pb-10">
            <div className="flex items-center gap-4">
                <Link href="/billing">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-3xl font-black tracking-tight text-foreground">{receipt.receiptNumber}</h1>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase border bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                            Paid
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Payment received on {new Date(receipt.paymentDate).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <ReceiptIcon className="h-4 w-4 text-primary" />
                                Receipt Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Hash className="h-4 w-4 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-muted-foreground">Receipt Number</p>
                                        <p className="font-medium text-foreground">{receipt.receiptNumber}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                        <ReceiptIcon className="h-4 w-4 text-emerald-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-muted-foreground">Amount Paid</p>
                                        <p className="text-2xl font-black text-foreground">
                                            RM {receipt.amountPaid.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                        <CreditCard className="h-4 w-4 text-blue-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-muted-foreground">Payment Method</p>
                                        <p className="font-medium text-foreground">{receipt.paymentMethod || "Not specified"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-border/30">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                        <Calendar className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase text-muted-foreground">Payment Date</p>
                                        <p className="font-medium text-foreground">{new Date(receipt.paymentDate).toLocaleDateString("en-MY", { year: "numeric", month: "long", day: "numeric" })}</p>
                                    </div>
                                </div>
                            </div>

                            {receipt.invoice && (
                                <div className="flex items-center justify-between py-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-lg bg-violet-500/10 flex items-center justify-center">
                                            <FileText className="h-4 w-4 text-violet-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase text-muted-foreground">Linked Invoice</p>
                                            <Link
                                                href={`/billing/invoices/${receipt.invoice.id}`}
                                                className="font-medium text-primary hover:underline"
                                            >
                                                {receipt.invoice.invoiceNumber} — {receipt.invoice.projectName}
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 sticky top-6">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-3">
                            <PDFDownloadLink
                                document={<PdfDocument type="Receipt" data={pdfData} companyDetails={companyDetails} />}
                                fileName={`Receipt_${receipt.receiptNumber}.pdf`}
                            >
                                {({ loading: pdfLoading }) => (
                                    <Button className="w-full gap-2 shadow-lg shadow-primary/25" disabled={pdfLoading}>
                                        <Download className="h-4 w-4" />
                                        {pdfLoading ? "Generating..." : "Download Receipt PDF"}
                                    </Button>
                                )}
                            </PDFDownloadLink>
                            {receipt.invoice && (
                                <Link href={`/billing/invoices/${receipt.invoice.id}`} className="block">
                                    <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5 gap-2">
                                        <FileText className="h-4 w-4" /> View Invoice
                                    </Button>
                                </Link>
                            )}
                            <Link href="/billing" className="block">
                                <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5">
                                    Back to Billing
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
