"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus, FileText, User, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { Quotation } from "@/types";
import { toast } from "sonner";

interface EditableItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
}

export default function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = React.use(params);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientBrn, setClientBrn] = useState("");
    const [notes, setNotes] = useState("");
    const [validUntil, setValidUntil] = useState("");
    const [items, setItems] = useState<EditableItem[]>([]);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/quotations/${id}`)
            .then((res) => res.json())
            .then((data: Quotation) => {
                if (data.status !== "Draft") {
                    toast.error("Only draft quotations can be edited");
                    router.push(`/billing/quotations/${id}`);
                    return;
                }
                setClientName(data.client_name);
                setClientEmail(data.client_email || "");
                setClientBrn(data.client_brn || "");
                setNotes(data.notes || "");
                setValidUntil(data.valid_until ? data.valid_until.slice(0, 10) : "");
                setItems(
                    data.items.map((item, idx) => ({
                        id: idx + 1,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                    }))
                );
                setLoading(false);
            })
            .catch(() => {
                toast.error("Failed to load quotation");
                router.push("/billing");
            });
    }, [id, router]);

    const addItem = () => {
        setItems([...items, { id: Date.now(), description: "", quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (itemId: number) => {
        setItems(items.filter((item) => item.id !== itemId));
    };

    const updateItem = (itemId: number, field: keyof EditableItem, value: string | number) => {
        setItems(items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)));
    };

    const calculateTotal = () => {
        return items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
    };

    const handleSave = async () => {
        if (!clientName.trim()) {
            toast.error("Client name is required");
            return;
        }
        if (items.length === 0) {
            toast.error("At least one line item is required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/quotations/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientName,
                    clientEmail: clientEmail || undefined,
                    clientBrn: clientBrn || undefined,
                    items: items.map(({ description, quantity, unitPrice }) => ({
                        description,
                        quantity,
                        unitPrice,
                    })),
                    notes,
                    validUntil: validUntil || undefined,
                }),
            });
            if (res.ok) {
                toast.success("Quotation updated successfully");
                router.push(`/billing/quotations/${id}`);
            } else {
                const err = await res.json().catch(() => null);
                toast.error(err?.error || "Failed to update quotation");
            }
        } catch {
            toast.error("Network error — could not save changes");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
            <div className="flex items-center gap-4">
                <Link href={`/billing/quotations/${id}`}>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Edit Quotation</h1>
                    <p className="text-sm text-muted-foreground mt-1">Modify this draft quotation.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <User className="h-4 w-4 text-primary" />
                                Client Information
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            <div className="grid gap-2">
                                <Label htmlFor="clientName">Client Name</Label>
                                <Input
                                    id="clientName"
                                    placeholder="Enter client company name"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="clientBrn">Business Registration Number (BRN)</Label>
                                <Input
                                    id="clientBrn"
                                    placeholder="Optional Client BRN"
                                    value={clientBrn}
                                    onChange={(e) => setClientBrn(e.target.value)}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="clientEmail">Email (Optional)</Label>
                                <Input
                                    id="clientEmail"
                                    placeholder="client@example.com"
                                    value={clientEmail}
                                    onChange={(e) => setClientEmail(e.target.value)}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="validUntil">Valid Until</Label>
                                <Input
                                    id="validUntil"
                                    type="date"
                                    value={validUntil}
                                    onChange={(e) => setValidUntil(e.target.value)}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <FileText className="h-4 w-4 text-primary" />
                                Line Items
                            </CardTitle>
                            <Button size="sm" onClick={addItem} type="button" className="gap-2 shadow-md shadow-primary/20">
                                <Plus className="h-3 w-3" /> Add Item
                            </Button>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {items.map((item) => (
                                <div key={item.id} className="grid grid-cols-12 gap-4 items-end bg-secondary/10 p-4 rounded-xl border border-border/50">
                                    <div className="col-span-6">
                                        <Label className="text-xs mb-1.5 block text-muted-foreground">Description</Label>
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateItem(item.id, "description", e.target.value)}
                                            placeholder="Item description"
                                            className="bg-secondary/20 border-border/50 h-9"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <Label className="text-xs mb-1.5 block text-muted-foreground">Qty</Label>
                                        <Input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                                            min={1}
                                            className="bg-secondary/20 border-border/50 h-9"
                                        />
                                    </div>
                                    <div className="col-span-3">
                                        <Label className="text-xs mb-1.5 block text-muted-foreground">Unit Price (RM)</Label>
                                        <Input
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
                                            min={0}
                                            className="bg-secondary/20 border-border/50 h-9"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-9 w-9"
                                            onClick={() => removeItem(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            <div className="flex justify-end pt-6 border-t border-border/50">
                                <div className="text-right">
                                    <p className="text-sm font-medium text-muted-foreground">Total Estimate</p>
                                    <p className="text-3xl font-black text-foreground">RM {calculateTotal().toLocaleString()}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Terms & Conditions</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Textarea
                                placeholder="Enter payment terms, validity, etc."
                                className="min-h-[120px] bg-secondary/20 border-border/50 focus:border-primary/50 font-mono text-sm leading-relaxed"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 sticky top-6">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-3">
                            <Button
                                className="w-full gap-2 shadow-lg shadow-primary/25"
                                onClick={handleSave}
                                disabled={saving || !clientName.trim()}
                            >
                                {saving ? (
                                    <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                                ) : (
                                    <><Save className="h-4 w-4" /> Save Changes</>
                                )}
                            </Button>
                            <Link href={`/billing/quotations/${id}`} className="block">
                                <Button variant="outline" className="w-full border-primary/20 hover:bg-primary/5">
                                    Cancel
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
