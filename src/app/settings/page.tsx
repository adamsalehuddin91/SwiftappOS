"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Save, Loader2, Image as ImageIcon, Upload, X } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
    const [formData, setFormData] = useState({
        companyName: "",
        address: "",
        contactNo: "",
        email: "",
        website: "",
        brn: "",
        sstNumber: "",
        enableSst: false,
        bankName: "",
        bankAccount: "",
        bankSwift: "",
        logoUrl: "",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        async function fetchSettings() {
            try {
                const res = await fetch("/api/settings");
                if (res.ok) {
                    const data = await res.json();
                    setFormData({
                        companyName: data.companyName || "",
                        address: data.address || "",
                        contactNo: data.contactNo || "",
                        email: data.email || "",
                        website: data.website || "",
                        brn: data.brn || "",
                        sstNumber: data.sstNumber || "",
                        enableSst: data.enableSst || false,
                        bankName: data.bankName || "",
                        bankAccount: data.bankAccount || "",
                        bankSwift: data.bankSwift || "",
                        logoUrl: data.logoUrl || "",
                    });
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
                toast.error("Failed to load settings.");
            } finally {
                setLoading(false);
            }
        }
        fetchSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);

        try {
            const res = await fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success("Settings saved successfully.");
            } else {
                toast.error("Failed to save settings.");
            }
        } catch (error) {
            console.error("Save error:", error);
            toast.error("An error occurred while saving.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append("logo", file);
            const res = await fetch("/api/settings/logo", { method: "POST", body: fd });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");
            setFormData((prev) => ({ ...prev, logoUrl: data.url }));
            toast.success("Logo uploaded. Klik Save Settings untuk simpan.");
        } catch (err: any) {
            toast.error(err.message || "Failed to upload logo.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    const inputClass = "flex h-10 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-black tracking-tight">Business Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Update your company details used for quotations and invoices.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Company Details */}
                <Card className="border-primary/20 shadow-2xl shadow-primary/5">
                    <CardHeader className="border-b border-border/50 pb-4">
                        <CardTitle>Company Details</CardTitle>
                        <CardDescription>
                            These details will appear on your generated PDF documents.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Company Name <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. SwiftApp Ecosystem"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Contact Number <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    name="contactNo"
                                    value={formData.contactNo}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. +60123456789"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Email <span className="text-red-500">*</span></label>
                                <input
                                    required
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. admin@swiftapp.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Website (Optional)</label>
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. https://swiftapp.com"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Business Registration Number (BRN) <span className="text-muted-foreground font-normal text-xs">(Optional)</span></label>
                                <input
                                    name="brn"
                                    value={formData.brn}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. 202301123456"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold">SST Number <span className="text-muted-foreground font-normal text-xs">(Optional)</span></label>
                                    <input
                                        name="sstNumber"
                                        value={formData.sstNumber}
                                        onChange={handleChange}
                                        className={inputClass}
                                        placeholder="e.g. W10-1808-31012345"
                                    />
                                </div>
                                <label className="flex items-center space-x-3 cursor-pointer p-4 rounded-lg border border-border/50 bg-secondary/20 hover:bg-secondary/40 transition-colors">
                                    <input
                                        type="checkbox"
                                        checked={formData.enableSst}
                                        onChange={(e) => setFormData(prev => ({ ...prev, enableSst: e.target.checked }))}
                                        className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary bg-background"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-foreground">Apply 8% SST globally</span>
                                        <span className="text-xs text-muted-foreground">If enabled, 8% SST will be added to all newly generated invoices and quotations.</span>
                                    </div>
                                </label>
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <label className="text-sm font-semibold">Address <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    name="address"
                                    value={formData.address}
                                    onChange={handleChange}
                                    rows={3}
                                    className="flex w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Full company address..."
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Bank Details */}
                <Card className="border-primary/20 shadow-2xl shadow-primary/5">
                    <CardHeader className="border-b border-border/50 pb-4">
                        <CardTitle>Bank Details</CardTitle>
                        <CardDescription>
                            Payment information displayed on invoices for client bank transfers.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Bank Name</label>
                                <input
                                    name="bankName"
                                    value={formData.bankName}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. Maybank / CIMB / Public Bank"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">Account Number</label>
                                <input
                                    name="bankAccount"
                                    value={formData.bankAccount}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. 1234567890"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold">SWIFT Code <span className="text-muted-foreground font-normal text-xs">(Optional)</span></label>
                                <input
                                    name="bankSwift"
                                    value={formData.bankSwift}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="e.g. MABORKLAXXX"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Logo */}
                <Card className="border-primary/20 shadow-2xl shadow-primary/5">
                    <CardHeader className="border-b border-border/50 pb-4">
                        <CardTitle>Company Logo</CardTitle>
                        <CardDescription>
                            Logo akan muncul pada PDF invois, quotation dan resit. Upload terus atau guna URL.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">

                        {/* Upload zone */}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/svg+xml"
                            className="hidden"
                            onChange={handleLogoUpload}
                        />
                        <div
                            onClick={() => !uploading && fileInputRef.current?.click()}
                            className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 hover:bg-primary/10 hover:border-primary/50 transition-all cursor-pointer"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    <p className="text-sm font-medium text-muted-foreground">Uploading...</p>
                                </>
                            ) : (
                                <>
                                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Upload className="h-5 w-5 text-primary" />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-foreground">Klik untuk upload logo</p>
                                        <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WebP, SVG — max 2MB</p>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Preview + clear */}
                        {formData.logoUrl && (
                            <div className="flex items-center gap-4 p-4 border border-border/50 rounded-xl bg-secondary/10">
                                <div className="w-20 h-20 rounded-lg border border-border/50 bg-white flex items-center justify-center overflow-hidden shrink-0">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={formData.logoUrl}
                                        alt="Logo preview"
                                        className="max-w-full max-h-full object-contain p-1"
                                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Logo semasa</p>
                                    <p className="text-xs text-foreground truncate">{formData.logoUrl}</p>
                                    <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
                                        <ImageIcon className="h-3 w-3" /> Akan muncul pada semua PDF
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFormData((p) => ({ ...p, logoUrl: "" }))}
                                    className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                    title="Remove logo"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}

                        {/* Fallback — paste URL */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase text-muted-foreground">
                                Atau masukkan URL logo terus
                            </label>
                            <input
                                name="logoUrl"
                                value={formData.logoUrl}
                                onChange={handleChange}
                                className={inputClass}
                                placeholder="https://yourdomain.com/logo.png"
                            />
                        </div>

                    </CardContent>
                </Card>

                {/* Save Button */}
                <div className="flex justify-end pt-4 border-t border-border/50">
                    <button
                        type="submit"
                        disabled={saving}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-10 py-2 px-6 shadow-lg shadow-primary/20"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Save Settings
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
