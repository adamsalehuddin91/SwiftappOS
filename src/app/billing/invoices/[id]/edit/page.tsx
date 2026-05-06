"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus, FileText, User, Loader2, Save, Receipt, FolderOpen } from "lucide-react";
import Link from "next/link";
import { Invoice, InvoiceType } from "@/types";
import { toast } from "sonner";

interface EditableItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
}

const INVOICE_TYPES: InvoiceType[] = ["Deposit", "Progress", "Final", "Monthly"];

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = React.use(params);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [invoiceStatus, setInvoiceStatus] = useState<string>("Draft");
    const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [type, setType] = useState<InvoiceType>("Deposit");
    const [amount, setAmount] = useState(0);
    const [dueDate, setDueDate] = useState("");
    const [notes, setNotes] = useState("");
    const [clientName, setClientName] = useState("");
    const [clientEmail, setClientEmail] = useState("");
    const [clientBrn, setClientBrn] = useState("");
    const [items, setItems] = useState<EditableItem[]>([]);

    useEffect(() => {
        fetch("/api/projects?limit=100")
            .then(r => r.json())
            .then(d => setProjects((d.data ?? []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/invoices/${id}`)
            .then((res) => res.json())
            .then((data: Invoice) => {
                if (data.status !== "Draft" && data.status !== "Sent") {
                    toast.error("Only Draft or Sent invoices can be edited");
                    router.push(`/billing/invoices/${id}`);
                    return;
                }
                setInvoiceStatus(data.status);
                setSelectedProjectId(data.project_id ?? "");
                setType(data.type);
                setAmount(data.amount);
                setDueDate(data.due_date ? data.due_date.slice(0, 10) : "");
                setNotes(data.notes || "");
                setClientName(data.client_name || "");
                setClientEmail(data.client_email || "");
                setClientBrn(data.client_brn || "");
                setItems(
                    (data.items || []).map((item, idx) => ({
                        id: idx + 1,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                    }))
                );
                setLoading(false);
            })
            .catch(() => {
                toast.error("Failed to load invoice");
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

    // Sync amount with items total when items change
    useEffect(() => {
        if (items.length > 0) {
            setAmount(calculateTotal());
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);

    const handleSave = async () => {
        if (!clientName.trim()) {
            toast.error("Client name is required");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/invoices/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId: selectedProjectId || null,
                    type,
                    amount: items.length > 0 ? calculateTotal() : amount,
                    dueDate: dueDate || undefined,
                    notes,
                    clientName,
                    clientEmail: clientEmail || undefined,
                    clientBrn: clientBrn || undefined,
                    items: items.length > 0
                        ? items.map(({ description, quantity, unitPrice }) => ({
                              description,
                              quantity,
                              unitPrice,
                          }))
                        : undefined,
                }),
            });
            if (res.ok) {
                toast.success("Invoice updated successfully");
                router.push(`/billing/invoices/${id}`);
            } else {
                const err = await res.json().catch(() => null);
                toast.error(err?.error || "Failed to update invoice");
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
                <Link href={`/billing/invoices/${id}`}>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Edit Invoice</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {invoiceStatus === "Sent" ? "Sent invoice — notes, due date & client details only." : "Modify this draft invoice."}
                    </p>
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
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <FolderOpen className="h-4 w-4 text-primary" />
                                Project Link
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="grid gap-2">
                                <Label htmlFor="project">Link to Project</Label>
                                <select
                                    id="project"
                                    value={selectedProjectId}
                                    onChange={(e) => setSelectedProjectId(e.target.value)}
                                    className="flex h-10 w-full rounded-md border bg-secondary/20 border-border/50 focus:border-primary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                >
                                    <option value="">— No Project —</option>
                                    {projects.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <Receipt className="h-4 w-4 text-primary" />
                                Invoice Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-5">
                            {invoiceStatus === "Sent" && (
                                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-600 font-medium">
                                    Invoice already sent — amount and line items are locked.
                                </div>
                            )}
                            <div className="grid gap-2">
                                <Label htmlFor="type">Invoice Type</Label>
                                <select
                                    id="type"
                                    value={type}
                                    disabled={invoiceStatus === "Sent"}
                                    onChange={(e) => setType(e.target.value as InvoiceType)}
                                    className="flex h-10 w-full rounded-md border bg-secondary/20 border-border/50 focus:border-primary/50 px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {INVOICE_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="amount">Amount (RM)</Label>
                                <Input
                                    id="amount"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(Number(e.target.value))}
                                    min={0}
                                    disabled={items.length > 0 || invoiceStatus === "Sent"}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                                {items.length > 0 && invoiceStatus !== "Sent" && (
                                    <p className="text-xs text-muted-foreground">Amount is calculated from line items.</p>
                                )}
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="dueDate">Due Date</Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={dueDate}
                                    onChange={(e) => setDueDate(e.target.value)}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className={`border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 ${invoiceStatus === "Sent" ? "opacity-50 pointer-events-none" : ""}`}>
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                                <FileText className="h-4 w-4 text-primary" />
                                Line Items
                            </CardTitle>
                            {invoiceStatus !== "Sent" && (
                                <Button size="sm" onClick={addItem} type="button" className="gap-2 shadow-md shadow-primary/20">
                                    <Plus className="h-3 w-3" /> Add Item
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            {items.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-6 italic">
                                    No line items. Click &quot;Add Item&quot; to add breakdown, or set the amount directly above.
                                </p>
                            )}
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

                            {items.length > 0 && (
                                <div className="flex justify-end pt-6 border-t border-border/50">
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-muted-foreground">Total</p>
                                        <p className="text-3xl font-black text-foreground">RM {calculateTotal().toLocaleString()}</p>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                        <CardHeader className="border-b border-border/50 pb-4">
                            <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Notes</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Textarea
                                placeholder="Additional notes or payment instructions"
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
                            <Link href={`/billing/invoices/${id}`} className="block">
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
