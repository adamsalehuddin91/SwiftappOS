"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Settings2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Milestone } from "@/types";

export default function EditMilestoneDialog({ milestone }: { milestone: Milestone }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formData, setFormData] = useState({
        name: milestone.name,
        status: milestone.status,
        amount: milestone.amount,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/milestones/${milestone.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    amount: Number(formData.amount),
                }),
            });

            if (res.ok) {
                setOpen(false);
                toast.success("Milestone updated successfully.");
                router.refresh();
            } else {
                toast.error("Failed to update milestone.");
            }
        } catch (error) {
            console.error("Failed to update milestone", error);
            toast.error("An error occurred while saving.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this milestone? This action cannot be undone.")) return;
        setDeleting(true);

        try {
            const res = await fetch(`/api/milestones/${milestone.id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setOpen(false);
                toast.success("Milestone deleted.");
                router.refresh();
            } else {
                toast.error("Failed to delete milestone.");
            }
        } catch (error) {
            console.error("Failed to delete milestone", error);
            toast.error("An error occurred while deleting.");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="text-muted-foreground hover:text-primary transition-colors pb-1">
                    <Settings2 className="h-4 w-4" />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px] border-primary/20 bg-background/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Edit Milestone</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleUpdate} className="space-y-4 pt-4">
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Name <span className="text-red-500">*</span></label>
                        <input
                            required
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Amount (RM) <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="number"
                            step="0.01"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase text-muted-foreground">Status</label>
                        <select
                            name="status"
                            value={formData.status}
                            onChange={handleChange}
                            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                            <option value="Pending">Pending</option>
                            <option value="InProgress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Invoiced">Invoiced</option>
                            <option value="Paid">Paid</option>
                        </select>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-border/50">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleDelete}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 px-2"
                            disabled={deleting}
                        >
                            {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        </Button>
                        <div className="flex gap-2">
                            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading} className="shadow-lg shadow-primary/20">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
