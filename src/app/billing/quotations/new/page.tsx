
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus, Download } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { PdfDocument } from "@/lib/pdf-generator";

const PDFDownloadLink = dynamic(
    () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
    {
        ssr: false,
        loading: () => <Button disabled>Loading PDF...</Button>,
    }
);

interface QuotationItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
}

export default function NewQuotationPage() {
    const [items, setItems] = useState<QuotationItem[]>([
        { id: 1, description: "Backend Development", quantity: 1, unitPrice: 5000 },
    ]);
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    const addItem = () => {
        setItems([
            ...items,
            { id: Date.now(), description: "", quantity: 1, unitPrice: 0 },
        ]);
    };

    const removeItem = (id: number) => {
        setItems(items.filter((item) => item.id !== id));
    };

    const updateItem = (id: number, field: keyof QuotationItem, value: string | number) => {
        setItems(
            items.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    };

    const pdfData = {
        number: "SWIFT/QT/2023/001",
        clientName: clientName || "Client Name",
        clientEmail: clientEmail || "email@example.com",
        items: items,
        total: calculateTotal(),
        notes: "1. 50% Deposit required to commence work.\n2. Balance 50% upon completion.\n3. Quotation valid for 14 days."
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/billing">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">New Quotation</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Client Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="clientName">Client Name</Label>
                                <Input
                                    id="clientName"
                                    placeholder="Enter client name"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="clientEmail">Email (Optional)</Label>
                                <Input
                                    id="clientEmail"
                                    placeholder="client@example.com"
                                    value={clientEmail}
                                    onChange={(e) => setClientEmail(e.target.value)}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="projectTitle">Project Title</Label>
                                <Input id="projectTitle" placeholder="e.g. E-Commerce Web App" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Items</CardTitle>
                            <Button size="sm" onClick={addItem} type="button">
                                <Plus className="h-4 w-4 mr-2" /> Add Item
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {items.map((item, index) => (
                                <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                                    <div className="col-span-6">
                                        <Label className="text-xs mb-1 block">Description</Label>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                            placeholder="Item description"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs mb-1 block">Qty</Label>
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                                            min={1}
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs mb-1 block">Unit Price (RM)</Label>
                                        <Input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
                                            min={0}
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                            onClick={() => removeItem(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-end pt-4 border-t">
                                <div className="text-right">
                                    <p className="text-sm text-muted-foreground">Total Amount</p>
                                    <p className="text-2xl font-bold">RM {calculateTotal().toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Terms & Conditions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Textarea placeholder="Enter payment terms, validity, etc." className="min-h-[100px]" defaultValue="1. 50% Deposit required to commence work.\n2. Balance 50% upon completion.\n3. Quotation valid for 14 days." />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {isClient && (
                                <PDFDownloadLink
                                    document={<PdfDocument type="Quotation" data={pdfData} />}
                                    fileName={`quotation-${Date.now()}.pdf`}
                                >
                                    {({ blob, url, loading, error }) => (
                                        <Button className="w-full" disabled={loading}>
                                            <Download className="mr-2 h-4 w-4" />
                                            {loading ? "Generating PDF..." : "Download PDF"}
                                        </Button>
                                    )}
                                </PDFDownloadLink>
                            )}
                            <Button variant="outline" className="w-full">Save as Draft</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
