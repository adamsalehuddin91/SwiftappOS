"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Trash2, Plus, Download, FileText, User, CheckCircle2, Loader2, Phone, Calendar, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { PdfDocument } from "@/lib/pdf-generator";
import { QUOTATION_PRESETS } from "@/lib/billing-presets";
import { toast } from "sonner";

const PDFDownloadLink = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => <Button disabled className="w-full">Loading Engine...</Button>,
  }
);

interface QuotationItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
}

function NewQuotationPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [items, setItems] = useState<QuotationItem[]>([
    { id: 1, description: "", quantity: 1, unitPrice: 0 },
  ]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientBrn, setClientBrn] = useState("");
  const [validDays, setValidDays] = useState("30");
  const [notes, setNotes] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [companyDetails, setCompanyDetails] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => setCompanyDetails(data))
      .catch(() => toast.error("Failed to load company settings"));

    const projectId = searchParams.get("projectId");
    if (projectId) {
      fetch(`/api/projects/${projectId}`)
        .then(r => r.json())
        .then(data => {
          if (data?.client_name) setClientName(data.client_name);
          if (data?.client_email) setClientEmail(data.client_email);
          if (data?.client_brn) setClientBrn(data.client_brn);
        })
        .catch(() => {});
    }
  }, [searchParams]);

  const applyPreset = (presetId: string) => {
    const preset = QUOTATION_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setActivePreset(presetId);
    setItems(preset.items.map((item, idx) => ({ ...item, id: idx + 1 })));
    setNotes(preset.notes);
    setValidDays(preset.validDays);
    setSaved(false);
    toast.success(`Preset "${preset.label}" diapply`);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now(), description: "", quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const updateItem = (id: number, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const calculateTotal = () => {
    return items.reduce((acc, item) => acc + item.quantity * item.unitPrice, 0);
  };

  async function handleSaveDraft() {
    if (!clientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (items.length === 0) {
      toast.error("At least one line item is required");
      return;
    }
    const emptyDescIdx = items.findIndex(i => !i.description.trim());
    if (emptyDescIdx !== -1) {
      toast.error(`Item #${emptyDescIdx + 1} description cannot be empty`);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          clientBrn: clientBrn || undefined,
          items: items.map(({ description, quantity, unitPrice }) => ({ description, quantity, unitPrice })),
          notes,
          validUntil: validDays
            ? new Date(Date.now() + Number(validDays) * 86400000).toISOString().split("T")[0]
            : undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSaved(true);
        toast.success("Quotation saved as draft");
        if (data?.id) router.push(`/billing/quotations/${data.id}`);
      } else {
        const err = await res.json().catch(() => null);
        const msg = typeof err?.error === "string"
          ? err.error
          : err?.error?.fieldErrors
            ? Object.entries(err.error.fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(", ")}`).join(" | ")
            : "Failed to save quotation";
        toast.error(msg);
      }
    } catch {
      toast.error("Network error — could not save quotation");
    } finally {
      setSaving(false);
    }
  }

  const pdfData = {
    number: "SWIFT/QT/DRAFT",
    clientName: clientName || "Client Name",
    clientEmail: clientEmail || "",
    clientPhone: clientPhone || "",
    clientBrn: clientBrn,
    items: items,
    total: calculateTotal(),
    notes,
    validUntil: validDays
      ? new Date(Date.now() + Number(validDays) * 86400000).toISOString().split("T")[0]
      : undefined,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Link href="/billing">
          <Button variant="ghost" size="icon" className="h-10 w-10 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">New Quotation</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a proposal for a new client.</p>
        </div>
      </div>

      {/* Quick Presets */}
      <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
        <CardHeader className="border-b border-border/50 pb-4">
          <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <Zap className="h-4 w-4 text-primary" />
            Quick Preset — SwiftApps Packages
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {QUOTATION_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className={`rounded-xl border-2 p-4 text-left transition-all ${
                  activePreset === preset.id
                    ? preset.color + " ring-2 ring-offset-1 ring-current"
                    : preset.color
                }`}
              >
                <div className="font-black text-sm mb-1">{preset.label}</div>
                <div className="text-xs font-bold opacity-70">
                  RM {preset.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
          {activePreset && (
            <p className="text-xs text-muted-foreground mt-3">
              ✓ Preset diapply — edit mana-mana field mengikut keperluan client.
            </p>
          )}
        </CardContent>
      </Card>

      {saved && (
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="py-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            <span className="font-bold text-emerald-700">Quotation saved as draft!</span>
            <Link href="/billing" className="ml-auto text-sm font-bold text-emerald-600 hover:underline">
              View Quotations
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* Client Info */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <User className="h-4 w-4 text-primary" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  placeholder="Nama syarikat / individu"
                  value={clientName}
                  onChange={(e) => { setClientName(e.target.value); setSaved(false); }}
                  className="bg-secondary/20 border-border/50 focus:border-primary/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="clientPhone" className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-primary" />Phone</Label>
                  <Input
                    id="clientPhone"
                    placeholder="011-xxxx xxxx"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="clientBrn">BRN (Optional)</Label>
                  <Input
                    id="clientBrn"
                    placeholder="No. Pendaftaran Syarikat"
                    value={clientBrn}
                    onChange={(e) => setClientBrn(e.target.value)}
                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="clientEmail">Email (Optional)</Label>
                  <Input
                    id="clientEmail"
                    placeholder="client@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="bg-secondary/20 border-border/50 focus:border-primary/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="validDays" className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-primary" />Valid For</Label>
                  <select
                    id="validDays"
                    value={validDays}
                    onChange={(e) => setValidDays(e.target.value)}
                    className="h-10 rounded-md border border-border/50 bg-secondary/20 px-3 text-sm focus:border-primary/50 focus:outline-none"
                  >
                    <option value="7">7 hari</option>
                    <option value="14">14 hari</option>
                    <option value="30">30 hari</option>
                    <option value="60">60 hari</option>
                    <option value="90">90 hari</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
            <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4 text-primary" />
                Line Items
              </CardTitle>
              <Button size="sm" onClick={addItem} type="button" className="gap-2 shadow-md shadow-primary/20">
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              {items.map((item) => (
                <div key={item.id} className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border/50">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-11">
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Description</Label>
                      <Textarea
                        value={item.description}
                        onChange={(e) => updateItem(item.id, "description", e.target.value)}
                        placeholder="Nama + penerangan perkhidmatan (boleh paste feature list)"
                        className="bg-secondary/20 border-border/50 min-h-[80px] text-sm leading-relaxed"
                      />
                    </div>
                    <div className="col-span-1 pb-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10 h-9 w-9"
                        onClick={() => removeItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Qty</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, "quantity", Number(e.target.value))}
                        min={1}
                        className="bg-secondary/20 border-border/50 h-9"
                      />
                    </div>
                    <div>
                      <Label className="text-xs mb-1.5 block text-muted-foreground">Unit Price (RM)</Label>
                      <Input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, "unitPrice", Number(e.target.value))}
                        min={0}
                        className="bg-secondary/20 border-border/50 h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex justify-end pt-6 border-t border-border/50">
                <div className="text-right">
                  <p className="text-sm font-medium text-muted-foreground">Jumlah Keseluruhan</p>
                  <p className="text-3xl font-black text-foreground">RM {calculateTotal().toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Terma & Syarat</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <Textarea
                placeholder="Syarat pembayaran, tempoh sah, nota lain..."
                className="min-h-[140px] bg-secondary/20 border-border/50 focus:border-primary/50 font-mono text-sm leading-relaxed"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Actions sidebar */}
        <div className="space-y-6">
          <Card className="border-primary/20 bg-card/50 backdrop-blur-md shadow-lg shadow-primary/5 sticky top-6">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base font-bold uppercase tracking-wider text-muted-foreground">Actions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              {isClient && (
                <PDFDownloadLink
                  document={<PdfDocument type="Quotation" data={pdfData} companyDetails={companyDetails} />}
                  fileName={`quotation-${Date.now()}.pdf`}
                >
                  {({ loading }) => (
                    <Button className="w-full gap-2 shadow-lg shadow-primary/25" disabled={loading}>
                      <Download className="h-4 w-4" />
                      {loading ? "Generating..." : "Download PDF"}
                    </Button>
                  )}
                </PDFDownloadLink>
              )}
              <Button
                variant="outline"
                className="w-full border-primary/20 hover:bg-primary/5"
                onClick={handleSaveDraft}
                disabled={saving || !clientName.trim() || saved}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving...</>
                ) : saved ? (
                  <><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />Saved</>
                ) : (
                  "Save as Draft"
                )}
              </Button>

              {/* Preset summary */}
              {activePreset && (() => {
                const p = QUOTATION_PRESETS.find(x => x.id === activePreset);
                return p ? (
                  <div className="pt-3 border-t border-border/50">
                    <p className="text-xs font-bold uppercase text-muted-foreground mb-2">Active Preset</p>
                    <div className={`rounded-lg border px-3 py-2 text-xs font-bold ${p.color}`}>
                      {p.label} — RM {p.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0).toLocaleString()}
                    </div>
                  </div>
                ) : null;
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewQuotationPage() {
  return (
    <Suspense>
      <NewQuotationPageInner />
    </Suspense>
  );
}
