"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";
import type { Project } from "@/types";

export default function EditProjectDialog({ project }: { project: Project }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: project.name,
        status: project.status,
        sowDetails: project.sow_details || "",
        clientName: project.client_name || "",
        clientEmail: project.client_email || "",
        clientBrn: project.client_brn || "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/projects/${project.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                setOpen(false);
                toast.success("Project updated successfully.");
                router.refresh();
            } else {
                toast.error("Failed to update project.");
            }
        } catch (error) {
            console.error("Error updating project:", error);
            toast.error("An error occurred while saving.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 shadow-sm text-muted-foreground hover:text-foreground">
                    <Settings2 className="h-3.5 w-3.5" />
                    Edit Details
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] border-primary/20 bg-background/95 backdrop-blur-xl">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold tracking-tight">Edit Project Details</DialogTitle>
                    <DialogDescription>
                        Make changes to your project scope, status, and client information here.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Project Name <span className="text-red-500">*</span></label>
                            <input
                                required
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. SwiftApp Redesign"
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
                                <option value="Drafting">Drafting</option>
                                <option value="Dev">Dev</option>
                                <option value="UAT">UAT</option>
                                <option value="Live">Live</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Client Name</label>
                            <input
                                name="clientName"
                                value={formData.clientName}
                                onChange={handleChange}
                                placeholder="Business Name"
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Client Email</label>
                            <input
                                type="email"
                                name="clientEmail"
                                value={formData.clientEmail}
                                onChange={handleChange}
                                placeholder="client@mail.com"
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Client BRN</label>
                            <input
                                name="clientBrn"
                                value={formData.clientBrn}
                                onChange={handleChange}
                                placeholder="Business Registration Number"
                                className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-1 col-span-2">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">Scope of Work</label>
                            <textarea
                                name="sowDetails"
                                value={formData.sowDetails}
                                onChange={handleChange}
                                rows={4}
                                placeholder="Define project deliverables and scope..."
                                className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/50">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="shadow-lg shadow-primary/20">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
