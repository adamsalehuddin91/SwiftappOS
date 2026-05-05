"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Plus, Loader2, Trash2, Settings2, Check, X } from "lucide-react";
import { toast } from "sonner";
import type { TimeLog } from "@/types";

export default function TimeLogger({ projectId, initialTimeLogs }: { projectId: string; initialTimeLogs: TimeLog[] }) {
    const [timeLogs, setTimeLogs] = useState<TimeLog[]>(initialTimeLogs);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [editData, setEditData] = useState({ hours: "", description: "", date: "" });

    const [formData, setFormData] = useState({
        hours: "",
        description: "",
        date: new Date().toISOString().split("T")[0],
    });

    const totalHours = timeLogs.reduce((acc, log) => acc + Number(log.hours), 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/projects/${projectId}/time`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hours: Number(formData.hours),
                    description: formData.description,
                    date: formData.date
                }),
            });

            if (res.ok) {
                const newLog = await res.json();
                setTimeLogs([newLog, ...timeLogs]);
                setIsAdding(false);
                setFormData({ ...formData, hours: "", description: "" });
                toast.success("Time log added.");
            } else {
                toast.error("Failed to add time log.");
            }
        } catch (error) {
            console.error("Failed to log time", error);
            toast.error("An error occurred while logging time.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (logId: string) => {
        if (!confirm("Delete this time log?")) return;
        setDeletingId(logId);

        try {
            const res = await fetch(`/api/time-logs/${logId}`, {
                method: "DELETE",
            });

            if (res.ok) {
                setTimeLogs((prev) => prev.filter((l) => l.id !== logId));
                toast.success("Time log deleted.");
            } else {
                toast.error("Failed to delete time log.");
            }
        } catch (error) {
            console.error("Failed to delete time log", error);
            toast.error("An error occurred while deleting.");
        } finally {
            setDeletingId(null);
        }
    };

    const startEdit = (log: TimeLog) => {
        setEditId(log.id);
        setEditData({
            hours: log.hours.toString(),
            description: log.description || "",
            date: new Date(log.date).toISOString().split("T")[0]
        });
    };

    const handleEditSubmit = async (e: React.FormEvent, logId: string) => {
        e.preventDefault();
        setEditLoading(true);

        try {
            const res = await fetch(`/api/time-logs/${logId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    hours: Number(editData.hours),
                    description: editData.description,
                    date: editData.date
                }),
            });

            if (res.ok) {
                const updatedLog = await res.json();
                setTimeLogs((prev) => prev.map((l) => (l.id === logId ? updatedLog : l)));
                setEditId(null);
                toast.success("Time log updated.");
            } else {
                toast.error("Failed to update time log.");
            }
        } catch (error) {
            console.error("Failed to update time log", error);
            toast.error("An error occurred while updating.");
        } finally {
            setEditLoading(false);
        }
    };

    return (
        <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 mt-6">
            <CardHeader className="pb-3 border-b border-border/50 flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-4 w-4 text-primary" />
                    Time Tracking
                </CardTitle>
                <Button size="sm" onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"} className="h-8 gap-1 shadow-md shadow-primary/20">
                    <Plus className={`h-3 w-3 ${isAdding ? "rotate-45" : ""} transition-transform`} />
                    {isAdding ? "Cancel" : "Log Time"}
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
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Hours</label>
                                <input required type="number" step="0.5" min="0.5" placeholder="e.g. 2.5" value={formData.hours} onChange={(e) => setFormData({ ...formData, hours: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                            </div>
                            <div className="space-y-1 lg:col-span-2">
                                <label className="text-xs font-semibold uppercase text-muted-foreground">Description</label>
                                <input required type="text" placeholder="What did you work on?" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <Button type="submit" size="sm" disabled={loading}>
                                {loading && <Loader2 className="h-3 w-3 mr-2 animate-spin" />}
                                Save Time Log
                            </Button>
                        </div>
                    </form>
                )}

                {timeLogs.length === 0 ? (
                    <div className="text-center py-6 text-sm text-muted-foreground">No hours logged yet.</div>
                ) : (
                    <div className="space-y-2">
                        {timeLogs.map((log) => (
                            <div key={log.id} className="group flex flex-col p-3 text-sm border-b border-border/30 last:border-0 hover:bg-secondary/10 rounded-lg transition-colors">
                                {editId === log.id ? (
                                    <form onSubmit={(e) => handleEditSubmit(e, log.id)} className="flex items-start gap-4">
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 flex-1">
                                            <input required type="date" value={editData.date} onChange={(e) => setEditData({ ...editData, date: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background/50 text-xs px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                            <input required type="number" step="0.5" min="0.5" value={editData.hours} onChange={(e) => setEditData({ ...editData, hours: e.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background/50 text-xs px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
                                            <input required type="text" value={editData.description} onChange={(e) => setEditData({ ...editData, description: e.target.value })} className="flex lg:col-span-2 h-8 w-full rounded-md border border-input bg-background/50 text-xs px-2 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" />
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
                                            <span className="font-semibold text-foreground">{log.description}</span>
                                            <div className="text-xs text-muted-foreground mt-0.5">{new Date(log.date).toLocaleDateString()}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="font-bold whitespace-nowrap bg-primary/10 text-primary px-2.5 py-1 rounded-md">{Number(log.hours)} hrs</div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => startEdit(log)}
                                                    className="text-muted-foreground hover:text-primary p-1 rounded-md hover:bg-primary/10 transition-colors"
                                                >
                                                    <Settings2 className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(log.id)}
                                                    disabled={deletingId === log.id}
                                                    className="text-muted-foreground hover:text-red-500 p-1 rounded-md hover:bg-red-500/10 transition-colors"
                                                >
                                                    {deletingId === log.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
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
                    <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Time Spent</span>
                    <span className="text-lg font-black text-foreground">{totalHours} hrs</span>
                </div>
            </CardContent>
        </Card>
    );
}
