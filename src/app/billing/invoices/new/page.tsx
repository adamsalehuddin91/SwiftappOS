"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2, Zap, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { Project } from "@/types";
import { toast } from "sonner";
import dynamic from "next/dynamic";
import { PdfDocument } from "@/lib/pdf-generator";
import { INVOICE_TC, SYSTEM_TYPES, buildInvoiceDescription } from "@/lib/billing-presets";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <Button disabled className="w-full">Loading Engine...</Button>,
  }
);

const inputCls =
  "flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

type Mode = "project" | "manual";
type LineItem = { description: string; quantity: number; unitPrice: number };
const INVOICE_TYPES = ["Deposit", "Progress", "Final", "Monthly"] as const;

function NewInvoicePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("project");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(1000);
  const [selectedSystemId, setSelectedSystemId] = useState<string>("");
  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [milestoneTotal, setMilestoneTotal] = useState<number>(0);

  // ── Manual (ad-hoc) invoice state ──
  const [manualProjectId, setManualProjectId] = useState<string>(""); // optional link
  const [manualType, setManualType] = useState<(typeof INVOICE_TYPES)[number]>("Final");
  const [manualClient, setManualClient] = useState({ name: "", email: "", brn: "" });
  const [manualItems, setManualItems] = useState<LineItem[]>([
    { description: "Baki pembayaran (selepas siap & live)", quantity: 1, unitPrice: 0 },
  ]);
  const [manualNotes, setManualNotes] = useState<string>(INVOICE_TC);

  useEffect(() => {
    const projectIdFromUrl = searchParams.get("projectId");

    Promise.all([
      fetch("/api/projects?limit=100").then((r) => r.json()),
      fetch("/api/settings").then((r) => r.json()),
    ])
      .then(([projectsData, settingsData]) => {
        const list: Project[] = projectsData.data ?? (Array.isArray(projectsData) ? projectsData : []);
        setProjects(list);
        if (projectIdFromUrl && list.some((p: Project) => p.id === projectIdFromUrl)) {
          setSelectedProjectId(projectIdFromUrl);
        }
        if (settingsData && !settingsData.error) setCompanyDetails(settingsData);
      })
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const project = projects.find((p) => p.id === selectedProjectId);

  // Fetch milestone total when project changes
  useEffect(() => {
    if (!selectedProjectId) { setMilestoneTotal(0); return; }
    fetch(`/api/projects/${selectedProjectId}`)
      .then((r) => r.json())
      .then((d) => {
        const total = (d.milestones ?? []).reduce((s: number, m: { amount: number }) => s + Number(m.amount), 0);
        setMilestoneTotal(total);
      })
      .catch(() => setMilestoneTotal(0));
  }, [selectedProjectId]);

  const baseTotal = milestoneTotal > 0 ? milestoneTotal : 10000;

  const billingStages = [
    { id: "Deposit", label: "Deposit (50%)", amount: Math.round(baseTotal * 0.5 * 100) / 100, type: "Deposit" as const },
    { id: "Progress", label: "Progress (25%)", amount: Math.round(baseTotal * 0.25 * 100) / 100, type: "Progress" as const },
    { id: "Final", label: "Handover (25%)", amount: Math.round(baseTotal * 0.25 * 100) / 100, type: "Final" as const },
    { id: "Monthly", label: "Monthly Retainer", amount: 0, type: "Monthly" as const },
  ];

  const selectedStageData = billingStages.find((s) => s.id === selectedStage);
  const selectedSystem = SYSTEM_TYPES.find((s) => s.id === selectedSystemId);
  const itemDescription = selectedStageData && selectedSystem
    ? buildInvoiceDescription(selectedStageData.id, selectedSystem.short)
    : selectedStageData?.label || "";

  // ── Manual helpers ──
  const manualTotal = manualItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0), 0);
  const manualValid =
    manualClient.name.trim().length > 0 &&
    manualItems.some((it) => it.description.trim() && (Number(it.unitPrice) || 0) > 0) &&
    manualTotal > 0;

  const updateItem = (idx: number, patch: Partial<LineItem>) =>
    setManualItems((items) => items.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  const addItem = () => setManualItems((items) => [...items, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (idx: number) =>
    setManualItems((items) => (items.length > 1 ? items.filter((_, i) => i !== idx) : items));

  const onPickManualProject = (id: string) => {
    setManualProjectId(id);
    const p = projects.find((x) => x.id === id);
    if (p) setManualClient({ name: p.client_name || p.name || "", email: p.client_email || "", brn: p.client_brn || "" });
  };

  async function handleCreateInvoice() {
    if (!selectedProjectId || !selectedStageData) return;
    setSaving(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          type: selectedStageData.type,
          amount: selectedStage === "Monthly" ? customAmount : selectedStageData.amount,
          items: [
            {
              description: itemDescription,
              quantity: 1,
              unitPrice: selectedStage === "Monthly" ? customAmount : selectedStageData.amount,
            },
          ],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSaved(true);
        toast.success("Invoice created successfully");
        router.push(`/billing/invoices/${created.id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error || "Failed to create invoice");
      }
    } catch {
      toast.error("Failed to create invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateManual() {
    if (!manualValid) return;
    setSaving(true);
    try {
      const items = manualItems
        .filter((it) => it.description.trim())
        .map((it) => ({ description: it.description.trim(), quantity: Number(it.quantity) || 1, unitPrice: Number(it.unitPrice) || 0 }));
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: manualProjectId || null,
          type: manualType,
          amount: manualTotal,
          items,
          clientName: manualClient.name.trim(),
          clientEmail: manualClient.email.trim() || null,
          clientBrn: manualClient.brn.trim() || null,
          notes: manualNotes || null,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setSaved(true);
        toast.success("Invoice created successfully");
        router.push(`/billing/invoices/${created.id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(typeof err.error === "string" ? err.error : "Failed to create invoice");
      }
    } catch {
      toast.error("Failed to create invoice. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Generate Invoice</h1>
          <p className="text-sm text-muted-foreground mt-1">Bill clients for completed milestones — atau invois manual.</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex rounded-xl border border-border/50 bg-secondary/30 p-1">
        <button
          onClick={() => { setMode("project"); setSaved(false); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${mode === "project" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          Ikut Project
        </button>
        <button
          onClick={() => { setMode("manual"); setSaved(false); }}
          className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${mode === "manual" ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
        >
          Invois Manual
        </button>
      </div>

      {saved && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="font-bold text-emerald-700">Invoice created successfully!</span>
            <Link href="/billing" className="ml-auto text-sm font-bold text-emerald-600 hover:underline">
              View Invoices
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {mode === "project" ? (
            <>
              <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Select Project</CardTitle>
                  <CardDescription>Choose a project to bill.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Tiada project lagi. Guna <button onClick={() => setMode("manual")} className="text-primary font-bold hover:underline">Invois Manual</button> untuk invois tanpa project.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.map((p) => (
                        <div
                          key={p.id}
                          onClick={() => { setSelectedProjectId(p.id); setSaved(false); }}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedProjectId === p.id
                            ? "border-primary bg-primary/10 ring-1 ring-primary"
                            : "border-border/50 hover:bg-secondary/40"
                            }`}
                        >
                          <div className="font-bold text-foreground">{p.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">{p.status} Mode</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {project && (
                <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 animate-in slide-in-from-bottom-4">
                  <CardHeader className="border-b border-border/50 pb-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                      <Zap className="h-4 w-4 text-primary" />
                      Jenis Sistem
                    </CardTitle>
                    <CardDescription>Pilih jenis sistem untuk jana deskripsi item secara automatik.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="flex flex-wrap gap-2">
                      {SYSTEM_TYPES.map((sys) => (
                        <button
                          key={sys.id}
                          type="button"
                          onClick={() => { setSelectedSystemId(sys.id); setSaved(false); }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                            selectedSystemId === sys.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15"
                          }`}
                        >
                          {sys.label}
                        </button>
                      ))}
                      {selectedSystemId && (
                        <button
                          type="button"
                          onClick={() => setSelectedSystemId("")}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full border border-muted-foreground/30 text-muted-foreground hover:bg-secondary/50 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {selectedStageData && selectedSystem && (
                      <div className="mt-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1 font-semibold uppercase tracking-wide">Item Description Preview</p>
                        <p className="text-sm font-medium text-foreground">{itemDescription}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {project && (
                <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 animate-in slide-in-from-bottom-4">
                  <CardHeader className="border-b border-border/50 pb-4">
                    <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Billing Stage</CardTitle>
                    <CardDescription>Select a stage to invoice.</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {billingStages.map((stage) => (
                        <div key={stage.id} className="space-y-3">
                          <div
                            onClick={() => { setSelectedStage(stage.id); setSaved(false); }}
                            className={`flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${selectedStage === stage.id
                              ? "border-primary bg-primary/10 ring-1 ring-primary"
                              : "border-border/50 hover:bg-secondary/40"
                              }`}
                          >
                            <div>
                              <div className="font-medium text-foreground">{stage.label}</div>
                              <div className="text-sm text-muted-foreground">
                                {stage.id === "Monthly"
                                  ? "Custom Amount"
                                  : `RM ${stage.amount.toLocaleString()}${milestoneTotal > 0 ? " (dari milestone)" : " (default)"}`}
                              </div>
                            </div>
                            <div className="text-sm font-bold uppercase tracking-wider text-amber-500">
                              Pending
                            </div>
                          </div>

                          {selectedStage === stage.id && stage.id === "Monthly" && (
                            <div className="pl-4 border-l-2 border-primary/50 ml-2 animate-in slide-in-from-top-2">
                              <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
                                Monthly Fee (RM)
                              </label>
                              <input
                                type="number"
                                value={customAmount}
                                onChange={(e) => setCustomAmount(parseFloat(e.target.value) || 0)}
                                className={inputCls}
                                placeholder="Enter monthly retainer amount"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <>
              <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Maklumat Client</CardTitle>
                  <CardDescription>Invois manual — tak perlu project. Link ke project (pilihan) untuk auto-isi.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  {projects.length > 0 && (
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">Link ke Project (pilihan)</label>
                      <select className={inputCls} value={manualProjectId} onChange={(e) => onPickManualProject(e.target.value)}>
                        <option value="">— Tiada (ad-hoc) —</option>
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">Nama Client *</label>
                      <input className={inputCls} value={manualClient.name} onChange={(e) => { setManualClient((c) => ({ ...c, name: e.target.value })); setSaved(false); }} placeholder="cth: MessyMates Desaru" />
                    </div>
                    <div>
                      <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">Email (pilihan)</label>
                      <input className={inputCls} value={manualClient.email} onChange={(e) => setManualClient((c) => ({ ...c, email: e.target.value }))} placeholder="client@email.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">No. SSM / BRN (pilihan)</label>
                    <input className={inputCls} value={manualClient.brn} onChange={(e) => setManualClient((c) => ({ ...c, brn: e.target.value }))} placeholder="cth: 202301234567" />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Item Invois</CardTitle>
                  <CardDescription>Tambah satu atau lebih item. Cth: &quot;Baki pembayaran (50%)&quot;.</CardDescription>
                </CardHeader>
                <CardContent className="pt-6 space-y-3">
                  <div className="hidden md:grid grid-cols-[1fr_80px_120px_40px] gap-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-1">
                    <span>Deskripsi</span><span>Kuantiti</span><span>Harga (RM)</span><span></span>
                  </div>
                  {manualItems.map((it, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_80px_120px_40px] gap-2 items-center">
                      <input className={inputCls} value={it.description} onChange={(e) => { updateItem(idx, { description: e.target.value }); setSaved(false); }} placeholder="Deskripsi item" />
                      <input type="number" min={1} className={inputCls} value={it.quantity} onChange={(e) => updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })} />
                      <input type="number" min={0} step="0.01" className={inputCls} value={it.unitPrice} onChange={(e) => { updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 }); setSaved(false); }} />
                      <button type="button" onClick={() => removeItem(idx)} disabled={manualItems.length === 1} className="h-10 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-30">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={addItem} className="mt-1">
                    <Plus className="h-4 w-4 mr-1.5" /> Tambah Item
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
                <CardHeader className="border-b border-border/50 pb-4">
                  <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Jenis &amp; Nota</CardTitle>
                </CardHeader>
                <CardContent className="pt-6 space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">Jenis Invois</label>
                    <select className={inputCls} value={manualType} onChange={(e) => setManualType(e.target.value as (typeof INVOICE_TYPES)[number])}>
                      {INVOICE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-muted-foreground mb-1.5 block">Nota / Terma</label>
                    <textarea className={`${inputCls} h-24 py-2`} value={manualNotes} onChange={(e) => setManualNotes(e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <div>
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 sticky top-6">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {mode === "project" ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Project</span>
                    <span className="font-bold text-foreground">{project ? project.name : "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Stage</span>
                    <span className="font-bold text-foreground">{selectedStageData ? selectedStageData.label : "-"}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-bold text-foreground">{manualClient.name || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Item</span>
                    <span className="font-bold text-foreground">{manualItems.filter((i) => i.description.trim()).length}</span>
                  </div>
                </>
              )}
              <div className="pt-4 border-t border-border/50 flex justify-between">
                <span className="font-medium text-muted-foreground">Total (MYR)</span>
                <span className="font-black text-xl text-foreground">
                  {mode === "project"
                    ? (selectedStageData ? (selectedStage === "Monthly" ? customAmount : selectedStageData.amount).toLocaleString("en-MY", { minimumFractionDigits: 2 }) : "0.00")
                    : manualTotal.toLocaleString("en-MY", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Project mode actions */}
              {mode === "project" && selectedProjectId && selectedStageData && !saved && (
                <div className="space-y-2">
                  <Button className="w-full shadow-lg shadow-primary/25" onClick={handleCreateInvoice} disabled={saving}>
                    {saving ? "Creating..." : "Create Invoice"}
                  </Button>
                  <PDFDownloadLink
                    document={
                      <PdfDocument
                        type="Invoice"
                        data={{
                          number: `INV-${new Date().getFullYear()}-DRAFT`,
                          clientName: project?.client_name || project?.name || "Client",
                          clientEmail: project?.client_email || "billing@client.com",
                          clientBrn: project?.client_brn,
                          items: [{
                            description: itemDescription,
                            quantity: 1,
                            unitPrice: selectedStage === "Monthly" ? customAmount : selectedStageData.amount,
                          }],
                          total: selectedStage === "Monthly" ? customAmount : selectedStageData.amount,
                          notes: INVOICE_TC,
                        }}
                        companyDetails={companyDetails}
                      />
                    }
                    fileName={`invoice-${selectedProjectId}-${selectedStage}.pdf`}
                  >
                    {({ loading: pdfLoading }) => (
                      <Button className="w-full" variant="outline" disabled={pdfLoading}>
                        {pdfLoading ? "Generating PDF..." : "Download PDF Preview"}
                      </Button>
                    )}
                  </PDFDownloadLink>
                </div>
              )}
              {mode === "project" && (!selectedProjectId || !selectedStageData) && (
                <Button className="w-full shadow-lg shadow-primary/25" disabled>Generate Invoice</Button>
              )}

              {/* Manual mode actions */}
              {mode === "manual" && (
                manualValid && !saved ? (
                  <div className="space-y-2">
                    <Button className="w-full shadow-lg shadow-primary/25" onClick={handleCreateManual} disabled={saving}>
                      {saving ? "Creating..." : "Create Invoice"}
                    </Button>
                    <PDFDownloadLink
                      document={
                        <PdfDocument
                          type="Invoice"
                          data={{
                            number: `INV-${new Date().getFullYear()}-DRAFT`,
                            clientName: manualClient.name || "Client",
                            clientEmail: manualClient.email || "billing@client.com",
                            clientBrn: manualClient.brn || undefined,
                            items: manualItems.filter((i) => i.description.trim()).map((i) => ({ description: i.description, quantity: Number(i.quantity) || 1, unitPrice: Number(i.unitPrice) || 0 })),
                            total: manualTotal,
                            notes: manualNotes,
                          }}
                          companyDetails={companyDetails}
                        />
                      }
                      fileName={`invoice-manual-${Date.now()}.pdf`}
                    >
                      {({ loading: pdfLoading }) => (
                        <Button className="w-full" variant="outline" disabled={pdfLoading}>
                          {pdfLoading ? "Generating PDF..." : "Download PDF Preview"}
                        </Button>
                      )}
                    </PDFDownloadLink>
                  </div>
                ) : (
                  <Button className="w-full shadow-lg shadow-primary/25" disabled>Generate Invoice</Button>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoicePageInner />
    </Suspense>
  );
}
