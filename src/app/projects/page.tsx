"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Folder, ArrowUpRight, Archive, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { SearchFilter } from "@/components/SearchFilter";
import { Pagination } from "@/components/Pagination";
import type { Project, PaginatedResponse } from "@/types";

const statusOptions = [
  { label: "Drafting", value: "Drafting" },
  { label: "Dev", value: "Dev" },
  { label: "UAT", value: "UAT" },
  { label: "Live", value: "Live" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (showArchived) params.set("archived", "true");

      const res = await fetch(`/api/projects?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch projects");

      const data: PaginatedResponse<Project> = await res.json();
      setProjects(data.data);
      setTotal(data.total);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load projects.");
    } finally {
      setLoading(false);
    }
  }, [page, search, status, showArchived]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleStatusChange = useCallback((value: string) => {
    setStatus(value);
    setPage(1);
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Projects</h1>
          <p className="text-muted-foreground mt-1">Manage your active builds and deployments.</p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2 shadow-lg shadow-primary/25">
            <Plus className="h-4 w-4" /> New Project
          </Button>
        </Link>
      </div>

      {/* Archived Toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setShowArchived(false); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors ${
            !showArchived
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => { setShowArchived(true); setPage(1); }}
          className={`px-4 py-2 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 ${
            showArchived
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "bg-secondary/30 text-muted-foreground hover:bg-secondary/50"
          }`}
        >
          <Archive className="h-3.5 w-3.5" />
          Archived
        </button>
      </div>

      {/* Search & Filter */}
      <SearchFilter
        placeholder="Search projects by name or client..."
        statusOptions={statusOptions}
        onSearch={handleSearch}
        onStatusChange={handleStatusChange}
        currentSearch={search}
        currentStatus={status}
      />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link href={`/projects/${project.id}`} key={project.id}>
                <Card className="group relative overflow-hidden border-primary/20 bg-card/50 backdrop-blur-md transition-all hover:border-primary/50 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                  </div>
                  <CardHeader className="flex flex-row items-center gap-4 space-y-0 pb-3">
                    <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
                      <Folder className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors">{project.name}</CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Last updated {new Date(project.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                          project.status === "Live"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : project.status === "Dev"
                              ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                              : project.status === "UAT"
                                ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                        }`}
                      >
                        {project.status}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">ID: {project.id.slice(0, 8)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {projects.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                {showArchived
                  ? "No archived projects."
                  : "No projects yet. Click \"New Project\" to get started."}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Showing {projects.length} of {total} projects
              </span>
              <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
