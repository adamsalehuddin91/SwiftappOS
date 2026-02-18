
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project, Milestone } from "@/types";
import { ArrowLeft, CheckCircle2, Clock, FileText, Plus } from "lucide-react";
import Link from "next/link";

// Mock data
const project: Project = {
    id: "1",
    name: "E-Commerce Revamp",
    status: "Dev",
    created_at: "2023-10-25",
    updated_at: "2023-10-26",
    sow_details: "Complete overhaul of the shopping cart including Stripe integration and responsive design.",
};

const milestones: Milestone[] = [
    { id: "m1", project_id: "1", name: "UI/UX Design", status: "Completed", amount: 2000, created_at: "2023-10-26" },
    { id: "m2", project_id: "1", name: "Backend API", status: "In Progress", amount: 3500, created_at: "2023-10-27" },
    { id: "m3", project_id: "1", name: "Frontend Integration", status: "Pending", amount: 3500, created_at: "2023-10-28" },
];

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
    // In a real app, fetch project by params.id

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Link href="/projects">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    {project.status}
                </span>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 space-y-6">
                    {/* Scope of Work */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                Scope of Work (SOW)
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                                {project.sow_details}
                            </p>
                        </CardContent>
                    </Card>

                    {/* Milestones */}
                    <Card>
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Milestones
                            </CardTitle>
                            <Button size="sm" className="h-8">
                                <Plus className="h-3 w-3 mr-1" /> Add Milestone
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {milestones.map((milestone) => (
                                    <div key={milestone.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50/50">
                                        <div>
                                            <div className="font-medium text-sm">{milestone.name}</div>
                                            <div className="text-xs text-muted-foreground">RM {milestone.amount.toLocaleString()}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${milestone.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                    milestone.status === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-slate-100 text-slate-600'
                                                }`}>
                                                {milestone.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div className="pt-2 border-t flex justify-between items-center text-sm font-medium">
                                    <span>Total Value</span>
                                    <span>RM {milestones.reduce((acc, m) => acc + m.amount, 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    {/* Quick Actions */}
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base">Billing Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <Button className="w-full justify-start" variant="outline">
                                Generate Quotation
                            </Button>
                            <Button className="w-full justify-start" variant="outline">
                                Create Invoice
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
