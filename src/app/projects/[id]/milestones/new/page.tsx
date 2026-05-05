"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Loader2, Save, Zap } from "lucide-react";
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
        amount: "",
        dueDate: "",
    });

    // Full presets — klik untuk fill name + description + amount sekaligus
    const MILESTONE_PRESETS = [
        // Billing stages
        { group: "Billing", label: "Deposit 50%",    name: "Bayaran Deposit — Mula Pembangunan",         description: "50% deposit dibayar sebelum kerja pembangunan bermula.",                                               amount: "" },
        { group: "Billing", label: "Progress 25%",   name: "Bayaran Progres — Pertengahan Pembangunan",  description: "25% mid-project payment selepas core features siap dan demo kepada klien.",                           amount: "" },
        { group: "Billing", label: "Final 25%",      name: "Bayaran Akhir — Sistem Go-Live",             description: "Baki 25% dibayar selepas sistem siap, diuji dan diserahkan kepada klien.",                           amount: "" },
        { group: "Billing", label: "Monthly RM200",  name: "Bayaran Bulanan — Pakej Basic",              description: "Bayaran bulanan merangkumi hosting, domain dan sokongan teknikal.",                                   amount: "200" },
        { group: "Billing", label: "Monthly RM280",  name: "Bayaran Bulanan — Pakej Standard",           description: "Bayaran bulanan merangkumi hosting, domain, sokongan teknikal dan kemaskini sistem.",                 amount: "280" },
        { group: "Billing", label: "Monthly RM350",  name: "Bayaran Bulanan — Pakej Pro",                description: "Bayaran bulanan merangkumi hosting, domain, sokongan teknikal, laporan dan feature tambahan.",        amount: "350" },
        // Project phases
        { group: "Fasa",    label: "Analisa",        name: "Analisa Keperluan & Skop Projek",            description: "Sesi requirement gathering, analisa keperluan klien dan pengesahan skop kerja.",                      amount: "" },
        { group: "Fasa",    label: "Wireframe",      name: "Wireframe & Mockup UI",                      description: "Rekabentuk wireframe, flow pengguna dan mockup antara muka sistem.",                                  amount: "" },
        { group: "Fasa",    label: "UI Design",      name: "Reka Bentuk UI/UX",                          description: "Design antara muka sistem menggunakan Figma atau tools design — untuk kelulusan klien.",              amount: "" },
        { group: "Fasa",    label: "Setup",          name: "Setup Projek & Struktur Asas",               description: "Setup repository, database, environment, CI/CD dan struktur projek.",                                 amount: "" },
        { group: "Fasa",    label: "Backend",        name: "Pembangunan Backend & API",                  description: "Pembangunan server-side logic, database schema, REST API dan business rules.",                        amount: "" },
        { group: "Fasa",    label: "Frontend",       name: "Pembangunan Frontend & UI",                  description: "Pembangunan antara muka pengguna, integrasi API dan pengalaman pengguna (UX).",                       amount: "" },
        { group: "Fasa",    label: "Integration",    name: "Integrasi & Testing",                        description: "Integrasi semua modul, unit testing, integration testing dan penyelesaian bugs.",                     amount: "" },
        { group: "Fasa",    label: "UAT",            name: "User Acceptance Testing (UAT)",              description: "Sesi UAT bersama klien — klien menguji sistem dan memberikan maklum balas.",                          amount: "" },
        { group: "Fasa",    label: "Deployment",     name: "Deployment & Go-Live",                       description: "Deploy sistem ke production server, setup domain, SSL dan konfigurasi production.",                   amount: "" },
        { group: "Fasa",    label: "Training",       name: "Training & Handover",                        description: "Sesi latihan kepada pengguna, serahkan dokumentasi dan manual sistem kepada klien.",                  amount: "" },
        // Modules
        { group: "Modul",   label: "Auth",           name: "Modul Login & Pengurusan Pengguna",          description: "Sistem login, daftar, reset password, tahap akses dan pengurusan peranan pengguna.",                  amount: "" },
        { group: "Modul",   label: "Dashboard",      name: "Modul Dashboard & Laporan",                  description: "Dashboard utama dengan statistik, carta dan laporan ringkasan prestasi sistem.",                     amount: "" },
        { group: "Modul",   label: "POS",            name: "Modul Point of Sale (POS)",                  description: "Sistem jualan, pilih produk, proses pembayaran, cetak resit dan rekod transaksi.",                    amount: "" },
        { group: "Modul",   label: "Inventori",      name: "Modul Inventori & Stok",                     description: "Pengurusan stok, masuk/keluar barang, alert stok rendah dan laporan inventori.",                     amount: "" },
        { group: "Modul",   label: "Yuran",          name: "Modul Yuran & Bayaran",                      description: "Pengurusan yuran pelajar/ahli, rekod bayaran, jana resit dan laporan tunggakan.",                    amount: "" },
        { group: "Modul",   label: "Pesakit",        name: "Modul Rekod Pesakit",                        description: "Pendaftaran pesakit, rekod perubatan, sejarah rawatan dan temujanji.",                               amount: "" },
        { group: "Modul",   label: "Staff",          name: "Modul Pengurusan Staf & Kehadiran",          description: "Rekod staf, jadual kerja, pengurusan cuti dan laporan kehadiran.",                                    amount: "" },
        { group: "Modul",   label: "Notifikasi",     name: "Modul Notifikasi WhatsApp",                  description: "Integrasi WhatsApp API untuk notifikasi automatik kepada pengguna atau klien.",                       amount: "" },
        { group: "Modul",   label: "Invoice",        name: "Modul Invois & Pengebilan",                  description: "Jana invois, rekod pembayaran, jana resit dan laporan kewangan.",                                     amount: "" },
        { group: "Modul",   label: "E-Commerce",     name: "Modul Katalog Produk & E-Commerce",          description: "Pengurusan produk, kategori, harga, cart dan proses checkout.",                                       amount: "" },
        // Support
        { group: "Support", label: "Bug Fix",        name: "Bug Fix & Pembaikan Pasca-Launch",           description: "Penyelesaian bugs yang dilaporkan selepas sistem go-live dalam tempoh waranti.",                      amount: "" },
        { group: "Support", label: "Maintenance",    name: "Penyelenggaraan Bulanan",                    description: "Penyelenggaraan sistem, kemaskini keselamatan, backup dan sokongan teknikal bulanan.",                amount: "" },
        { group: "Support", label: "Enhancement",    name: "Penambahbaikan & Feature Baru",              description: "Pembangunan feature tambahan atau penambahbaikan sistem berdasarkan permintaan klien.",               amount: "" },
    ];

    // Name-only suggestions untuk datalist (typing autocomplete)
    const MILESTONE_NAME_SUGGESTIONS = [
        "Analisa Keperluan & Skop Projek",
        "Wireframe & Mockup UI",
        "Reka Bentuk UI/UX",
        "Design Approval",
        "Setup Projek & Struktur Asas",
        "Pembangunan Backend & API",
        "Pembangunan Frontend & UI",
        "Integrasi & Testing",
        "User Acceptance Testing (UAT)",
        "Deployment & Go-Live",
        "Training & Handover",
        "Dokumentasi Sistem",
        "Modul Login & Pengurusan Pengguna",
        "Modul Dashboard & Laporan",
        "Modul Point of Sale (POS)",
        "Modul Inventori & Stok",
        "Modul Yuran & Bayaran",
        "Modul Rekod Pesakit",
        "Modul Pengurusan Staf & Kehadiran",
        "Modul Notifikasi WhatsApp",
        "Modul Invois & Pengebilan",
        "Modul Katalog Produk & E-Commerce",
        "Modul Pengurusan Pelajar",
        "Modul Pengurusan Guru",
        "Modul Laporan & Eksport",
        "Bayaran Deposit — Mula Pembangunan",
        "Bayaran Progres — Pertengahan Pembangunan",
        "Bayaran Akhir — Sistem Go-Live",
        "Bayaran Bulanan — Pakej Basic",
        "Bayaran Bulanan — Pakej Standard",
        "Bayaran Bulanan — Pakej Pro",
        "Bug Fix & Pembaikan Pasca-Launch",
        "Penyelenggaraan Bulanan",
        "Penambahbaikan & Feature Baru",
        "Integrasi Third-Party API",
        "Setup Server & Domain",
        "Konfigurasi SSL & Keselamatan",
        "Migrasi Data",
        "Code Review & Audit",
        "Performance Optimisation",
    ];

    const PRESET_GROUPS = ["Billing", "Fasa", "Modul", "Support"] as const;
    const GROUP_LABELS: Record<string, string> = {
        Billing: "💰 Billing",
        Fasa: "🔧 Fasa Kerja",
        Modul: "📦 Modul",
        Support: "🛠 Support",
    };

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

                        {/* Quick Fill — grouped presets */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Zap className="h-4 w-4 text-primary" />
                                <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Quick Fill</span>
                                <span className="text-xs text-muted-foreground">(auto-fill nama + deskripsi + amaun)</span>
                            </div>
                            <div className="space-y-2">
                                {PRESET_GROUPS.map((group) => (
                                    <div key={group} className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-bold text-muted-foreground w-20 shrink-0">{GROUP_LABELS[group]}</span>
                                        {MILESTONE_PRESETS.filter((p) => p.group === group).map((preset) => (
                                            <button
                                                key={preset.label}
                                                type="button"
                                                onClick={() =>
                                                    setFormData((prev) => ({
                                                        ...prev,
                                                        name: preset.name,
                                                        description: preset.description,
                                                        amount: preset.amount,
                                                    }))
                                                }
                                                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                                                    formData.name === preset.name
                                                        ? "bg-primary text-primary-foreground border-primary"
                                                        : "border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/50"
                                                }`}
                                            >
                                                {preset.label}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">
                                    Milestone Name <span className="text-red-500">*</span>
                                    <span className="text-xs font-normal text-muted-foreground ml-2">— taip atau pilih dari senarai</span>
                                </Label>
                                {/* datalist provides dropdown suggestions while still allowing free-type */}
                                <datalist id="milestone-name-list">
                                    {MILESTONE_NAME_SUGGESTIONS.map((s) => (
                                        <option key={s} value={s} />
                                    ))}
                                </datalist>
                                <Input
                                    id="name"
                                    name="name"
                                    list="milestone-name-list"
                                    placeholder="Taip nama milestone atau pilih dari senarai..."
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
