
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project } from "@/types";
import { Plus, Folder } from "lucide-react";
import Link from "next/link";

const projects: Project[] = [
    {
        id: "1",
        name: "E-Commerce Revamp",
        status: "Dev",
        created_at: "2023-10-25",
        updated_at: "2023-10-26",
        sow_details: "Complete overhaul of the shopping cart.",
    },
    {
        id: "2",
        name: "Internal HR Portal",
        status: "UAT",
        created_at: "2023-09-15",
        updated_at: "2023-10-20",
        sow_details: "Employee onboarding module.",
    },
    {
        id: "3",
        name: "Marketing Landing Page",
        status: "Live",
        created_at: "2023-10-01",
        updated_at: "2023-10-10",
        sow_details: "Campaign for Q4 sales.",
    },
];

export default function ProjectsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
                <Button className="gap-2">
                    <Plus className="h-4 w-4" /> New Project
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {projects.map((project) => (
                    <Link href={`/projects/${project.id}`} key={project.id}>
                        <Card className="hover:bg-slate-50 transition-colors cursor-pointer h-full">
                            <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                <div className="p-2 bg-slate-100 rounded-lg">
                                    <Folder className="h-6 w-6 text-slate-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-base">{project.name}</CardTitle>
                                    <p className="text-xs text-muted-foreground">
                                        Updated {project.updated_at}
                                    </p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center justify-between text-sm">
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${project.status === "Live"
                                                ? "bg-green-100 text-green-700"
                                                : project.status === "Dev"
                                                    ? "bg-blue-100 text-blue-700"
                                                    : project.status === "UAT"
                                                        ? "bg-yellow-100 text-yellow-700"
                                                        : "bg-slate-100 text-slate-700"
                                            }`}
                                    >
                                        {project.status}
                                    </span>
                                    <span className="text-muted-foreground">ID: {project.id}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    );
}
