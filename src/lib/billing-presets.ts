export interface BillingPreset {
  id: string;
  label: string;
  tier: "pos" | "crm" | "sekolah" | "inventori" | "hr" | "bisnes";
  color: string;
  items: { description: string; quantity: number; unitPrice: number }[];
  notes: string;
  validDays: string;
}

const BASE_NOTES = (monthly: number) =>
  `1. Deposit 50% diperlukan sebelum kerja pembangunan bermula.\n2. Baki 50% dibayar selepas sistem go-live dan diserahkan kepada klien.\n3. Tahun seterusnya: RM ${monthly.toLocaleString()}/bulan (hosting + sokongan + kemaskini berterusan).\n4. Sebut harga ini sah selama 30 hari dari tarikh di atas.\n5. Setelah pembayaran diterima, sila hantar bukti pembayaran melalui WhatsApp atau emel.`;

export const INVOICE_TC =
  `1. Please send proof of payment via WhatsApp upon completion of payment.\n2. Payment is to be made via bank transfer to the account stated in the payment details section.\n3. This invoice is payable within 7 days from the date of issue.\n4. For any enquiries, please contact us via WhatsApp or email.`;

export const QUOTATION_PRESETS: BillingPreset[] = [
  {
    id: "pos",
    label: "Sistem POS",
    tier: "pos",
    color: "text-orange-600 border-orange-300 bg-orange-50 hover:bg-orange-100",
    items: [
      {
        description:
          "Sistem POS & Jualan (Tahun Pertama)\n\nPembangunan + penyelenggaraan sistem POS khusus. Termasuk:\n• Sistem POS (Tunai / QR / Bank Transfer)\n• Pengurusan produk & kategori\n• Laporan jualan harian & bulanan\n• Resit WhatsApp automatik kepada pelanggan\n• Dashboard ringkasan prestasi jualan\n• Hosting + domain 12 bulan (Vercel / Coolify)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 2500,
      },
    ],
    notes: BASE_NOTES(200),
    validDays: "30",
  },
  {
    id: "crm",
    label: "Sistem CRM",
    tier: "crm",
    color: "text-blue-600 border-blue-300 bg-blue-50 hover:bg-blue-100",
    items: [
      {
        description:
          "Sistem CRM & Pengurusan Pelanggan (Tahun Pertama)\n\nPembangunan + penyelenggaraan sistem CRM khusus. Termasuk:\n• Pengurusan data prospek & pelanggan aktif\n• Pipeline jualan & status follow-up\n• Sejarah & nota interaksi pelanggan\n• Peringatan follow-up automatik\n• Laporan prestasi jualan & konversi bulanan\n• Hosting + domain 12 bulan (Vercel / Coolify)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 3000,
      },
    ],
    notes: BASE_NOTES(280),
    validDays: "30",
  },
  {
    id: "sekolah",
    label: "Sistem Sekolah",
    tier: "sekolah",
    color: "text-emerald-600 border-emerald-300 bg-emerald-50 hover:bg-emerald-100",
    items: [
      {
        description:
          "Sistem Pengurusan Sekolah (Tahun Pertama)\n\nPembangunan + penyelenggaraan sistem pengurusan sekolah khusus. Termasuk:\n• Pendaftaran & profil pelajar\n• Pengurusan kelas, subjek & jadual\n• Sistem yuran & rekod pembayaran\n• Peringatan & notifikasi yuran via WhatsApp\n• Laporan kehadiran pelajar\n• Laporan koleksi yuran & tunggakan bulanan\n• Hosting + domain 12 bulan (Vercel / Coolify)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 4000,
      },
    ],
    notes: BASE_NOTES(280),
    validDays: "30",
  },
  {
    id: "inventori",
    label: "Sistem Inventori",
    tier: "inventori",
    color: "text-amber-600 border-amber-300 bg-amber-50 hover:bg-amber-100",
    items: [
      {
        description:
          "Sistem Pengurusan Inventori & Stok (Tahun Pertama)\n\nPembangunan + penyelenggaraan sistem inventori khusus. Termasuk:\n• Pengurusan produk & kategori stok\n• Rekod masuk & keluar stok\n• Peringatan stok rendah automatik\n• Laporan inventori & pergerakan stok bulanan\n• Carian & penapis produk pantas\n• Hosting + domain 12 bulan (Vercel / Coolify)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 2500,
      },
    ],
    notes: BASE_NOTES(200),
    validDays: "30",
  },
  {
    id: "hr",
    label: "Sistem HR & Gaji",
    tier: "hr",
    color: "text-purple-600 border-purple-300 bg-purple-50 hover:bg-purple-100",
    items: [
      {
        description:
          "Sistem Pengurusan HR & Gaji (Tahun Pertama)\n\nPembangunan + penyelenggaraan sistem HR & gaji khusus. Termasuk:\n• Profil & rekod pekerja lengkap\n• Kehadiran & pengurusan cuti pekerja\n• Pengiraan gaji + elaun + potongan automatik\n• Slip gaji digital (PDF / WhatsApp)\n• Laporan gaji & kehadiran bulanan\n• Hosting + domain 12 bulan (Vercel / Coolify)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 3500,
      },
    ],
    notes: BASE_NOTES(280),
    validDays: "30",
  },
  {
    id: "bisnes",
    label: "Sistem Bisnes (Full)",
    tier: "bisnes",
    color: "text-violet-600 border-violet-300 bg-violet-50 hover:bg-violet-100",
    items: [
      {
        description:
          "Sistem Pengurusan Bisnes — Pakej Lengkap (Tahun Pertama)\n\nPembangunan + penyelenggaraan sistem pengurusan bisnes menyeluruh. Termasuk:\n• Sistem POS (Tunai / QR / Terminal / Bank Transfer)\n• Pengurusan pelanggan + mata ganjaran (Loyalty Points)\n• Pengurusan kakitangan + komisyen automatik\n• Halaman tempahan dalam talian (public booking)\n• Pengurusan inventori barangan\n• Laporan jualan, komisyen & prestasi bulanan\n• Resit WhatsApp + pautan resit digital pelanggan\n• Hosting + domain 12 bulan (Vercel + Supabase)\n• Sokongan teknikal terus dengan Adam\n• Kemaskini & penambahbaikan sistem sepanjang tahun",
        quantity: 1,
        unitPrice: 4500,
      },
    ],
    notes: BASE_NOTES(350),
    validDays: "30",
  },
];

export const SYSTEM_TYPES = [
  { id: "pos",       label: "Sistem POS",       short: "Sistem POS & Jualan" },
  { id: "crm",       label: "Sistem CRM",       short: "Sistem CRM & Pengurusan Pelanggan" },
  { id: "sekolah",   label: "Sistem Sekolah",   short: "Sistem Pengurusan Sekolah" },
  { id: "inventori", label: "Sistem Inventori", short: "Sistem Inventori & Stok" },
  { id: "hr",        label: "Sistem HR & Gaji", short: "Sistem HR & Pengurusan Gaji" },
  { id: "bisnes",    label: "Sistem Bisnes",    short: "Sistem Pengurusan Bisnes" },
];

export const buildInvoiceDescription = (stage: string, systemShort: string): string => {
  switch (stage) {
    case "Deposit":  return `Bayaran Deposit 50% — Pembangunan ${systemShort}`;
    case "Progress": return `Bayaran Progres 25% — Fasa Pertengahan Pembangunan ${systemShort}`;
    case "Final":    return `Bayaran Akhir 50% — Go-Live & Penyerahan ${systemShort}`;
    case "Monthly":  return `Bayaran Bulanan — Hosting, Domain & Sokongan Teknikal (${systemShort})`;
    default:         return `Perkhidmatan — ${systemShort}`;
  }
};

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
