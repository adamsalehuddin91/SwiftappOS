"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, Plus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ProjectCost, CostCategory } from "@/types";

export default function CostTracker({ projectId, initialCosts }: { projectId: string; initialCosts: ProjectCost[] }) {
    const [costs, setCosts] = useState<ProjectCost[]>(initialCosts);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
            const res = await fetch(`/api/projects/${projectId}/costs?id=${costId}`, {
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
                            <div key={cost.id} className="group flex justify-between items-center p-3 text-sm border-b border-border/30 last:border-0 hover:bg-secondary/10 rounded-lg transition-colors">
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
                                    <button
                                        onClick={() => handleDelete(cost.id)}
                                        disabled={deletingId === cost.id}
                                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all"
                                    >
                                        {deletingId === cost.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    </button>
                                </div>
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
