"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";

export default function NewMilestonePage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const router = useRouter();
    const { id: projectId } = use(params);

    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        amount: "0",
        dueDate: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setError("Milestone name is required.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const res = await fetch("/api/milestones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    projectId,
                    name: formData.name,
                    description: formData.description,
                    amount: parseFloat(formData.amount) || 0,
                    dueDate: formData.dueDate || undefined,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create milestone");
            }

            router.push(`/projects/${projectId}`);
            router.refresh();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred.");
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-2xl mx-auto pb-10">
            <div className="flex items-center gap-4">
                <Link href={`/projects/${projectId}`}>
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Add Milestone</h1>
                    <p className="text-sm text-muted-foreground mt-1">Define a new phase or deliverable.</p>
                </div>
            </div>

            <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                <CardHeader className="border-b border-border/50 pb-4">
                    <CardTitle>Milestone Details</CardTitle>
                    <CardDescription>Specify the goal and its assigned value.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Milestone Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g. Phase 1: Authentication API"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description (Optional)</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="Briefly describe the deliverables..."
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="amount">Billable Amount (MYR)</Label>
                                    <Input
                                        id="amount"
                                        name="amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="e.g. 5000"
                                        value={formData.amount}
                                        onChange={handleChange}
                                        className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dueDate">Due Date (Optional)</Label>
                                    <Input
                                        id="dueDate"
                                        name="dueDate"
                                        type="date"
                                        value={formData.dueDate}
                                        onChange={handleChange}
                                        className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                    />
                                </div>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 text-red-500 text-sm font-medium rounded-md">
                                {error}
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-border/50 gap-4">
                            <Link href={`/projects/${projectId}`}>
                                <Button variant="outline" type="button" className="border-primary/20">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={saving} className="shadow-lg shadow-primary/25 gap-2">
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Adding...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save Milestone
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
