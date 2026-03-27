"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function NewProjectPage() {
    const router = useRouter();
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        clientName: "",
        clientEmail: "",
        sowDetails: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error("Project name is required.");
            return;
        }

        setSaving(true);

        try {
            const res = await fetch("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to create project");
            }

            const newProject = await res.json();
            toast.success("Project created successfully.");
            router.push(`/projects/${newProject.id}`);
        } catch (err: any) {
            console.error(err);
            toast.error(err.message || "An error occurred.");
            setSaving(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
            <div className="flex items-center gap-4">
                <Link href="/projects">
                    <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-foreground">Draft New Project</h1>
                    <p className="text-sm text-muted-foreground mt-1">Setup the workspace for your new client.</p>
                </div>
            </div>

            <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                <CardHeader className="border-b border-border/50 pb-4">
                    <CardTitle>Project Details</CardTitle>
                    <CardDescription>Fill out the primary client and scope information.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="name">Project Name <span className="text-red-500">*</span></Label>
                                <Input
                                    id="name"
                                    name="name"
                                    placeholder="e.g. Acme Backend Migration"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clientName">Client Name</Label>
                                <Input
                                    id="clientName"
                                    name="clientName"
                                    placeholder="e.g. Acme Corp"
                                    value={formData.clientName}
                                    onChange={handleChange}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="clientEmail">Client Email</Label>
                                <Input
                                    id="clientEmail"
                                    name="clientEmail"
                                    type="email"
                                    placeholder="e.g. contact@acme.com"
                                    value={formData.clientEmail}
                                    onChange={handleChange}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Short Description</Label>
                                <Input
                                    id="description"
                                    name="description"
                                    placeholder="Brief summary of the project goals"
                                    value={formData.description}
                                    onChange={handleChange}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                                />
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="sowDetails">Scope of Work (SOW)</Label>
                                <Textarea
                                    id="sowDetails"
                                    name="sowDetails"
                                    rows={6}
                                    placeholder="Detailed breakdown of features, phases, or deliverables..."
                                    value={formData.sowDetails}
                                    onChange={handleChange}
                                    className="bg-secondary/20 border-border/50 focus:border-primary/50 text-sm leading-relaxed font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4 border-t border-border/50 gap-4">
                            <Link href="/projects">
                                <Button variant="outline" type="button" className="border-primary/20">
                                    Cancel
                                </Button>
                            </Link>
                            <Button type="submit" disabled={saving} className="shadow-lg shadow-primary/25 gap-2">
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating Project...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Create Project
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
