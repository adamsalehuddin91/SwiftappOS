export interface BillingPreset {
  id: string;
  label: string;
  tier: "basic" | "standard" | "pro" | "custom";
  color: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  notes: string;
  validDays: string;
}

const BASE_NOTES = (monthly: number) =>
  `1. Deposit 50% diperlukan sebelum kerja pembangunan bermula.\n2. Baki 50% dibayar selepas sistem go-live dan diserahkan kepada klien.\n3. Tahun seterusnya: RM ${monthly.toLocaleString()}/bulan (hosting + sokongan + kemaskini berterusan).\n4. Sebut harga ini sah selama 30 hari dari tarikh di atas.\n5. Setelah pembayaran diterima, sila hantar bukti pembayaran kepada Adam melalui WhatsApp.`;

export const INVOICE_TC =
  `1. Sila hantar bukti pembayaran kepada Adam melalui WhatsApp setelah bayaran dibuat.\n2. Pembayaran melalui pindahan bank ke akaun yang dinyatakan dalam maklumat pembayaran.\n3. Invoice ini hendaklah dijelaskan dalam tempoh 7 hari dari tarikh terbitan.\n4. Untuk sebarang pertanyaan, hubungi Adam melalui WhatsApp atau emel.`;

export const QUOTATION_PRESETS: BillingPreset[] = [
  {
    id: "basic",
    label: "Basic",
    tier: "basic",
    color: "text-slate-600 border-slate-300 bg-slate-50 hover:bg-slate-100",
    items: [
      {
        description:
          "Sistem Pengurusan Bisnes — Pakej Basic (Tahun Pertama)\n\nPembangunan + penyelenggaraan sistem khusus. Termasuk:\n• Sistem POS (Tunai / QR / Bank Transfer)\n• Pengurusan pelanggan asas\n• Pengurusan kakitangan (sehingga 3 orang)\n• Laporan jualan bulanan\n• Resit WhatsApp automatik\n• Hosting + domain 12 bulan (Vercel / Coolify)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 2500,
      },
    ],
    notes: BASE_NOTES(200),
    validDays: "30",
  },
  {
    id: "standard",
    label: "Standard",
    tier: "standard",
    color: "text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100",
    items: [
      {
        description:
          "Sistem Pengurusan Bisnes — Pakej Standard (Tahun Pertama)\n\nPembangunan + penyelenggaraan sistem khusus. Termasuk:\n• Sistem POS (Tunai / QR / Terminal / Bank Transfer)\n• Pengurusan pelanggan + mata ganjaran (Loyalty Points)\n• Pengurusan kakitangan + komisyen automatik (sehingga 8 orang)\n• Halaman tempahan dalam talian (public booking)\n• Pengurusan inventori barangan\n• Laporan jualan & komisyen bulanan\n• Resit WhatsApp + pautan resit digital pelanggan\n• Hosting + domain 12 bulan (Vercel + Supabase)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini & penambahbaikan sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 3500,
      },
    ],
    notes: BASE_NOTES(280),
    validDays: "30",
  },
  {
    id: "pro",
    label: "Pro",
    tier: "pro",
    color: "text-violet-600 border-violet-300 bg-violet-50 hover:bg-violet-100",
    items: [
      {
        description:
          "Sistem Pengurusan Bisnes — Pakej Pro (Tahun Pertama)\n\nPembangunan + penyelenggaraan sistem khusus. Termasuk:\n• Sistem POS (Tunai / QR / Terminal / Bank Transfer)\n• Pengurusan pelanggan + mata ganjaran (Loyalty Points) + tier VIP\n• Pengurusan kakitangan + komisyen automatik (tidak terhad)\n• Multi-cawangan / multi-lokasi\n• Halaman tempahan dalam talian (public booking)\n• Pengurusan inventori barangan + peringatan stok rendah\n• Laporan jualan, komisyen & prestasi bulanan\n• Resit WhatsApp + pautan resit digital pelanggan\n• Akses Auditor (semak, edit resit, void dengan alasan)\n• Laporan tersuai mengikut keperluan bisnes\n• Hosting + domain 12 bulan (Vercel + Supabase)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini & penambahbaikan sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 4500,
      },
    ],
    notes: BASE_NOTES(350),
    validDays: "30",
  },
  {
    id: "salon-year1",
    label: "Salon (HMS)",
    tier: "custom",
    color: "text-emerald-600 border-emerald-300 bg-emerald-50 hover:bg-emerald-100",
    items: [
      {
        description:
          "Sistem Pengurusan Salon — Tahun Pertama\n\nPembangunan + penyelenggaraan sistem pengurusan salon khusus. Termasuk:\n• Sistem POS (Tunai / QR / Terminal / Bank Transfer)\n• Pengurusan pelanggan + mata ganjaran (Loyalty Points)\n• Pengurusan kakitangan + komisyen automatik (solo & sharing)\n• Halaman tempahan dalam talian (public booking)\n• Pengurusan inventori barangan\n• Laporan jualan & komisyen bulanan\n• Resit WhatsApp + pautan resit digital pelanggan\n• Akses Auditor (semak, edit resit, void dengan alasan)\n• Hosting + domain 12 bulan (Vercel + Supabase)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini & penambahbaikan sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 5000,
      },
    ],
    notes: BASE_NOTES(280),
    validDays: "30",
  },
];

export const INVOICE_PRESETS = [
  {
    id: "deposit-50",
    label: "Deposit 50%",
    description: "Bayaran deposit 50% untuk memulakan pembangunan sistem.",
    percentOf: 0.5,
    type: "Deposit" as const,
  },
  {
    id: "progress-25",
    label: "Progress 25%",
    description: "Bayaran progres 25% selepas fasa pembangunan selesai.",
    percentOf: 0.25,
    type: "Progress" as const,
  },
  {
    id: "final-50",
    label: "Baki 50%",
    description: "Bayaran baki 50% selepas sistem go-live dan terima.",
    percentOf: 0.5,
    type: "Final" as const,
  },
  {
    id: "monthly",
    label: "Bulanan",
    description: "Bayaran penyelenggaraan bulanan (hosting + sokongan + kemaskini).",
    percentOf: null,
    type: "Monthly" as const,
  },
];
