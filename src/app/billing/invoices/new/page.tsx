"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Loader2, Zap } from "lucide-react";
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

function NewInvoicePageInner() {
  const searchParams = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedStage, setSelectedStage] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [customAmount, setCustomAmount] = useState<number>(1000);
  const [selectedSystemId, setSelectedSystemId] = useState<string>("");
  const [companyDetails, setCompanyDetails] = useState<any>(null);

  useEffect(() => {
    const projectIdFromUrl = searchParams.get("projectId");

    fetch("/api/projects")
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : [];
        setProjects(list);
        if (projectIdFromUrl && list.some((p: Project) => p.id === projectIdFromUrl)) {
          setSelectedProjectId(projectIdFromUrl);
        }
      })
      .catch(() => toast.error("Failed to load projects"))
      .finally(() => setLoading(false));

    fetch("/api/settings")
      .then((r) => r.json())
      .then((data) => setCompanyDetails(data))
      .catch((err) => console.error("Error fetching settings:", err));
  }, [searchParams]);

  const project = projects.find((p) => p.id === selectedProjectId);

  const billingStages = [
    { id: "Deposit", label: "Deposit (50%)", amount: 5000, type: "Deposit" as const },
    { id: "Progress", label: "Progress (25%)", amount: 2500, type: "Progress" as const },
    { id: "Final", label: "Handover (25%)", amount: 2500, type: "Final" as const },
    { id: "Monthly", label: "Monthly Retainer", amount: 0, type: "Monthly" as const },
  ];

  const selectedStageData = billingStages.find((s) => s.id === selectedStage);
  const selectedSystem = SYSTEM_TYPES.find((s) => s.id === selectedSystemId);
  const itemDescription = selectedStageData && selectedSystem
    ? buildInvoiceDescription(selectedStageData.id, selectedSystem.short)
    : selectedStageData?.label || "";

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
        setSaved(true);
        toast.success("Invoice created successfully");
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
          <p className="text-sm text-muted-foreground mt-1">Bill clients for completed milestones.</p>
        </div>
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
                            {stage.id === "Monthly" ? "Custom Amount" : `RM ${stage.amount.toLocaleString()}`}
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
                            className="flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
        </div>

        <div>
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 sticky top-6">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Summary</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Project</span>
                <span className="font-bold text-foreground">{project ? project.name : "-"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Stage</span>
                <span className="font-bold text-foreground">
                  {selectedStageData ? selectedStageData.label : "-"}
                </span>
              </div>
              <div className="pt-4 border-t border-border/50 flex justify-between">
                <span className="font-medium text-muted-foreground">Total (MYR)</span>
                <span className="font-black text-xl text-foreground">
                  {selectedStageData
                    ? (selectedStage === "Monthly" ? customAmount : selectedStageData.amount).toLocaleString("en-MY", { minimumFractionDigits: 2 })
                    : "0.00"}
                </span>
              </div>

              {selectedProjectId && selectedStageData && !saved && (
                <div className="space-y-2">
                  <Button
                    className="w-full shadow-lg shadow-primary/25"
                    onClick={handleCreateInvoice}
                    disabled={saving}
                  >
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
              {(!selectedProjectId || !selectedStageData) && (
                <Button className="w-full shadow-lg shadow-primary/25" disabled>
                  Generate Invoice
                </Button>
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
