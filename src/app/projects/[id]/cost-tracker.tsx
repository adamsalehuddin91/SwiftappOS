"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Plus, Loader2, Trash2, Settings2, Check, X, Zap } from "lucide-react";
import { toast } from "sonner";
import type { ProjectCost, CostCategory } from "@/types";

const EXPENSE_PRESETS = [
    { label: "Vercel Pro", category: "Server" as const, amount: "60", description: "Vercel Pro Plan — Hosting Next.js" },
    { label: "Supabase Pro", category: "Server" as const, amount: "100", description: "Supabase Pro — Database + Auth + Storage" },
    { label: "Hetzner VPS", category: "Server" as const, amount: "30", description: "Hetzner Cloud VPS — Coolify Self-host" },
    { label: "Domain .my", category: "Domain" as const, amount: "70", description: "Domain .my — Pendaftaran Tahunan" },
    { label: "Domain .com", category: "Domain" as const, amount: "50", description: "Domain .com — Pendaftaran Tahunan" },
    { label: "Cloudflare", category: "Server" as const, amount: "0", description: "Cloudflare DNS + CDN + SSL" },
    { label: "WhatsApp API", category: "Software" as const, amount: "99", description: "WhatsApp Business API — Notifikasi" },
    { label: "Resend Email", category: "Software" as const, amount: "20", description: "Resend — Email API (Pro Plan)" },
    { label: "Coolify", category: "Server" as const, amount: "0", description: "Coolify Self-hosted — Deploy Platform" },
    { label: "Supabase Free", category: "Server" as const, amount: "0", description: "Supabase Free Tier — Database + Auth" },
    { label: "Nama.my Domain", category: "Domain" as const, amount: "80", description: "Domain nama.my — Pendaftaran Tahunan" },
    { label: "SSL Cert", category: "Server" as const, amount: "0", description: "SSL Certificate — Let's Encrypt / Cloudflare" },
];

export default function CostTracker({ projectId, initialCosts }: { projectId: string; initialCosts: ProjectCost[] }) {
    const [costs, setCosts] = useState<ProjectCost[]>(initialCosts);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editData, setEditData] = useState({ category: "Server" as CostCategory, amount: "", description: "", reference: "", date: "" });

    const [formData, setFormData] = useState({
        category: "Server" as CostCategory,
        amount: "",
        description: "",
        reference: "",
        date: new Date().toISOString().split("T")[0],
    });

    const totalCosts = costs.reduce((acc, cost) => acc + Number(cost.amount), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/projects/${projectId}/costs`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: formData.category,
                    amount: Number(formData.amount),
                    description: formData.description,
                    reference: formData.reference,
                    date: formData.date
                }),
            });

            if (res.ok) {
                const newCost = await res.json();
                setCosts([newCost, ...costs]);
                setIsAdding(false);
                setFormData({ ...formData, amount: "", description: "", reference: "" });
                toast.success("Expense added.");
            } else {
                toast.error("Failed to add expense.");
            }
        } catch (error) {
            console.error("Failed to log cost", error);
            toast.error("An error occurred while saving.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (costId: string) => {
        if (!confirm("Delete this expense?")) return;
        setDeletingId(costId);

        try {
            const res = await fetch(`/api/project-costs/${costId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setCosts((prev) => prev.filter((c) => c.id !== costId));
                toast.success("Expense deleted.");
            } else {
                toast.error("Failed to delete expense.");
            }
        } catch (error) {
            console.error("Failed to delete cost", error);
            toast.error("An error occurred while deleting.");
        } finally {
            setDeletingId(null);
        }
    };

    const startEdit = (cost: ProjectCost) => {
        setEditId(cost.id);
        setEditData({
            category: cost.category,
            amount: cost.amount.toString(),
            description: cost.description || "",
            reference: cost.reference || "",
            date: new Date(cost.date).toISOString().split("T")[0]
        });
    };

    const handleEditSubmit = async (e: React.FormEvent, costId: string) => {
        e.preventDefault();
        setEditLoading(true);

        try {
            const res = await fetch(`/api/project-costs/${costId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    category: editData.category,
                    amount: Number(editData.amount),
                    description: editData.description,
                    reference: editData.reference,
                    date: editData.date
                }),
            });

            if (res.ok) {
                const updatedCost = await res.json();
                setCosts((prev) => prev.map((c) => (c.id === costId ? updatedCost : c)));
                setEditId(null);
                toast.success("Expense updated.");
            } else {
                toast.error("Failed to update expense.");
            }
        } catch (error) {
            console.error("Failed to update expense", error);
            toast.error("An error occurred while updating.");
        } finally {
            setEditLoading(false);
        }
    };

    return (
        <Card className="border-red-500/20 bg-card/50 backdrop-blur-md shadow-lg shadow-red-500/5 mt-6">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                    <Receipt className="h-4 w-4 text-red-500" />
                    Project Expenses
                </CardTitle>
                <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"} className="h-8 gap-1 shadow-md hover:bg-red-500 hover:text-white transition-colors">
                    <Plus className={`h-3 w-3 ${isAdding ? "rotate-45" : ""} transition-transform`} />
                    {isAdding ? "Cancel" : "Add Expense"}
                </Button>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">

                {isAdding && (
                    <form onSubmit={handleSubmit} className="p-4 border border-border/50 rounded-xl bg-secondary/10 space-y-4 animate-in slide-in-from-top-2">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Zap className="h-3.5 w-3.5 text-red-400" />
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Quick Fill</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {EXPENSE_PRESETS.map((preset) => (
                                    <button
                                        key={preset.label}
                                        type="button"
                                        onClick={() =>
                                            setFormData((prev) => ({
                                                ...prev,
                                                category: preset.category,
                                                amount: preset.amount,
                                                description: preset.description,
                                            }))
                                        }
                                        className="px-3 py-1 text-xs font-medium rounded-full border border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/15 hover:border-red-500/50 transition-colors"
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Date</label>
                                <input required type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
                                <select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as CostCategory })} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                    <option value="Server">Server hosting</option>
                                    <option value="Domain">Domain Registration</option>
                                    <option value="Software">External Software</option>
                                    <option value="Other">Other Expenses</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Amount (RM)</label>
                                <input required type="number" step="0.01" min="0" placeholder="e.g. 50.00" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Ref / Invoice #</label>
                                <input type="text" placeholder="Optional" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                            </div>
                            <div className="space-y-1 lg:col-span-4">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
                                <input required type="text" placeholder="e.g. Vercel Pro Plan" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" size="sm" disabled={loading} className="bg-red-500 hover:bg-red-600 text-white">
                                {loading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                                Save Expense
                            </Button>
                        </div>
                    </form>
                )}

                {costs.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">No expenses logged yet.</div>
                ) : (
                    <div className="space-y-2">
                        {costs.map((cost) => (
                            <div key={cost.id} className="group flex flex-col p-3 text-sm border-b border-border/30 last:border-0 hover:bg-secondary/10 rounded-lg transition-colors">
                                {editId === cost.id ? (
                                    <form onSubmit={(e) => handleEditSubmit(e, cost.id)} className="flex items-start gap-4">
                                        <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 flex-1">
                                            <input required type="date" value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background/50 text-xs px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                            <select value={editData.category} onChange={(e) => setEditData({ ...editData, category: e.target.value as CostCategory })} className="flex h-8 w-full rounded-md border border-input bg-background/50 text-xs px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
                                                <option value="Server">Server</option>
                                                <option value="Domain">Domain</option>
                                                <option value="Software">Software</option>
                                                <option value="Other">Other</option>
                                            </select>
                                            <input required type="number" step="0.01" min="0" value={editData.amount} onChange={(e) => setEditData({ ...editData, amount: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background/50 text-xs px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                            <input type="text" placeholder="Ref" value={editData.reference} onChange={(e) => setEditData({ ...editData, reference: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background/50 text-xs px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                            <input required type="text" value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="flex lg:col-span-1 h-8 w-full rounded-md border border-input bg-background/50 text-xs px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Button type="submit" size="icon" variant="ghost" className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" disabled={editLoading}>
                                                {editLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                            </Button>
                                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary" onClick={() => setEditId(null)}>
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-xs uppercase px-2 py-0.5 rounded-sm bg-red-500/10 text-red-500">{cost.category}</span>
                                                <span className="font-semibold text-foreground">{cost.description}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                <span>{new Date(cost.date).toLocaleDateString()}</span>
                                                {cost.reference && <span>• Ref: {cost.reference}</span>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold whitespace-nowrap text-red-500">- RM {Number(cost.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEdit(cost)}
                                                    className="text-muted-foreground hover:text-primary p-1 rounded-md hover:bg-primary/10 transition-colors"
                                                >
                                                    <Settings2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(cost.id)}
                                                    disabled={deletingId === cost.id}
                                                    className="text-muted-foreground hover:text-red-500 p-1 rounded-md hover:bg-red-500/10 transition-colors"
                                                >
                                                    {deletingId === cost.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="pt-4 mt-2 border-t border-border/50 flex justify-between items-center">
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Expenses</span>
                    <span className="text-lg font-black text-red-500">RM {totalCosts.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
            </CardContent>
        </Card>
    );
}
