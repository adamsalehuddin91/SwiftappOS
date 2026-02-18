
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Project } from "@/types";

// Mock Projects
const projects: Project[] = [
    { id: "1", name: "E-Commerce Revamp", status: "Dev", created_at: "2023-10-25", updated_at: "2023-10-26" },
    { id: "2", name: "Internal HR Portal", status: "UAT", created_at: "2023-09-15", updated_at: "2023-10-20" },
];

export default function NewInvoicePage() {
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [selectedStage, setSelectedStage] = useState<string>("");

    const project = projects.find(p => p.id === selectedProjectId);

    const billingStages = [
        { id: 'deposit', label: 'Deposit (50%)', amount: 5000, status: 'Paid' },
        { id: 'progress', label: 'Progress (25%)', amount: 2500, status: 'Pending' },
        { id: 'final', label: 'Handover (25%)', amount: 2500, status: 'Pending' },
    ];

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4">
                <Link href="/billing">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">Generate Invoice</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Project</CardTitle>
                            <CardDescription>Choose a project to bill.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {projects.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => setSelectedProjectId(p.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${selectedProjectId === p.id
                                                ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                                                : 'hover:bg-slate-50'
                                            }`}
                                    >
                                        <div className="font-medium">{p.name}</div>
                                        <div className="text-sm text-muted-foreground">{p.status}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {project && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Billing Stage</CardTitle>
                                <CardDescription>Select a stage to invoice.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {billingStages.map((stage) => (
                                        <div
                                            key={stage.id}
                                            onClick={() => stage.status !== 'Paid' && setSelectedStage(stage.id)}
                                            className={`flex items-center justify-between p-4 rounded-lg border transition-all ${selectedStage === stage.id
                                                    ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                                                    : stage.status === 'Paid'
                                                        ? 'opacity-60 bg-slate-50 cursor-not-allowed'
                                                        : 'cursor-pointer hover:bg-slate-50'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-medium flex items-center gap-2">
                                                    {stage.label}
                                                    {stage.status === 'Paid' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
                                                </div>
                                                <div className="text-sm text-muted-foreground">RM {stage.amount.toLocaleString()}</div>
                                            </div>
                                            <div className="text-sm font-medium">
                                                {stage.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Project</span>
                                <span className="font-medium">{project ? project.name : '-'}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Stage</span>
                                <span className="font-medium">
                                    {selectedStage ? billingStages.find(s => s.id === selectedStage)?.label : '-'}
                                </span>
                            </div>
                            <div className="pt-4 border-t flex justify-between font-bold">
                                <span>Total (MYR)</span>
                                <span>
                                    {selectedStage
                                        ? billingStages.find(s => s.id === selectedStage)?.amount.toLocaleString()
                                        : '0.00'}
                                </span>
                            </div>

                            <Button className="w-full" disabled={!selectedProjectId || !selectedStage}>
                                Generate Invoice
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
