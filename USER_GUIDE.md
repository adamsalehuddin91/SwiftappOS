# SwiftAppOS — User Guide

> Internal business OS for SwiftApps freelance operation.
> Stack: Next.js 16 · Prisma · PostgreSQL · Coolify

---

## System Map

```
LOGIN → DASHBOARD
              ├── PROJECTS
              │     ├── Project Detail
              │     │     ├── Milestones
              │     │     ├── Time Logger
              │     │     └── Cost Tracker (Expenses)
              │     └── New Project
              ├── BILLING
              │     ├── Invoices → Invoice Detail → Record Payment → Receipt
              │     ├── Quotations → Convert to Invoice
              │     └── Receipts (tab)
              ├── ANALYTICS
              └── SETTINGS
```

---

## 1. Login

1. Buka app — auto redirect ke `/login` jika tiada session
2. Masukkan email + password
3. Redirect ke Dashboard selepas berjaya

---

## 2. Dashboard

Overview page yang tunjuk:
- **Revenue YTD** — wang dah masuk (paid invoices)
- **Pending Invoices** — bilangan + jumlah belum bayar
- **Active Projects** — projek sedang berjalan

Shortcut ke semua modul dari sini.

---

## 3. Projects Module

### 3.1 Buat Projek Baru

`/projects/new`

| Field | Required | Notes |
|-------|----------|-------|
| Project Name | ✓ | Nama projek / nama client |
| Status | — | Drafting / Dev / UAT / Live |
| Client Name | — | Nama syarikat client |
| Client Email | — | Email untuk billing |
| Client BRN | — | No. Pendaftaran Syarikat client |
| Description | — | Nota ringkas |
| Scope of Work | — | Detail kerja yang akan dibuat |

### 3.2 Project Detail Page

`/projects/:id`

Bahagian dalam project detail:

```
[Header]
  Project Name + Status badge
  Contract Value (hasil tambah semua milestone)
  Total Hours Logged
  Edit Project (⚙) | Archive

[Milestone Progress Bar]
  X / Y milestones completed (Z%)

[Scope of Work]
  Paparan SOW — boleh edit via ⚙

[Milestones]         ← LIHAT BAHAGIAN 4

[Time Logger]        ← LIHAT BAHAGIAN 5

[Cost Tracker]       ← LIHAT BAHAGIAN 6

[Billing Actions sidebar]
  → Generate Quotation
  → Create Invoice
```

---

## 4. MILESTONES — Cara Guna

Milestone adalah **pecahan kerja** dalam satu projek. Setiap milestone ada nama, nilai (RM) dan status.

### 4.1 Fungsi Milestone

- Track progress kerja secara berperingkat
- Nilai RM milestone = asas kiraan invoice (Deposit 50%, Progress 25%, Final 25%)
- Status milestone sync dengan status invoice/payment
- Progress bar dikira dari bilangan milestone selesai

### 4.2 Tambah Milestone

Klik `+ Add Milestone` dalam project detail.

| Field | Required | Notes |
|-------|----------|-------|
| Name | ✓ | e.g. "UI Design", "Backend API", "Deployment" |
| Amount (RM) | ✓ | Nilai kerja untuk milestone ni |
| Due Date | — | Tarikh sasaran siap |

### 4.3 Status Milestone

```
PENDING → IN PROGRESS → COMPLETED → INVOICED → PAID
```

| Status | Maksud |
|--------|--------|
| **Pending** | Kerja belum mula |
| **In Progress** | Kerja sedang berjalan |
| **Completed** | Kerja siap, tunggu invoice |
| **Invoiced** | Invoice dah dihantar untuk milestone ni |
| **Paid** | Payment dah diterima |

> **Auto-sync:** Bila invoice dibuat untuk project → milestone Completed auto tukar ke **Invoiced**.
> Bila invoice dibayar penuh → milestone Invoiced auto tukar ke **Paid**.

### 4.4 Edit / Delete Milestone

Klik ikon ⚙ pada baris milestone → dialog terbuka:
- Boleh tukar nama, amount, status
- Klik 🗑 untuk delete (confirm dulu)

### 4.5 Contoh Penggunaan Milestone

```
Project: E-Commerce System (RM 10,000)
─────────────────────────────────────────────────────
Milestone 1: Analisa & Wireframe    RM 1,000  Completed
Milestone 2: UI Design              RM 2,000  In Progress
Milestone 3: Backend Development    RM 4,000  Pending
Milestone 4: Testing & UAT          RM 1,500  Pending
Milestone 5: Deployment & Training  RM 1,500  Pending
─────────────────────────────────────────────────────
Total Contract Value: RM 10,000

→ Bila nak invoice Deposit:
  Create Invoice → Deposit (50%) → RM 5,000 auto-calculated
```

---

## 5. TIME LOGGER — Cara Guna

Time Logger untuk **rekod jam kerja** yang dihabiskan untuk setiap projek.

### 5.1 Fungsi Time Logger

- Track berapa jam dihabiskan untuk setiap projek
- Rekod apa yang dibuat pada hari tertentu
- Boleh calculate effective hourly rate (contract value ÷ total hours)
- Transparensi kepada diri sendiri tentang workload

### 5.2 Log Masa Kerja

Klik `Log Time` dalam project detail.

| Field | Required | Notes |
|-------|----------|-------|
| Date | ✓ | Tarikh kerja (default: hari ini) |
| Hours | ✓ | Berapa jam (boleh guna 0.5 increment) |
| Description | ✓ | Apa yang dibuat — e.g. "Setup database schema" |

### 5.3 Edit / Delete Time Log

Hover pada baris time log → ikon ⚙ (edit) dan 🗑 (delete) muncul.

### 5.4 Contoh Penggunaan Time Logger

```
Project: POS System
─────────────────────────────────────────────────
2026-05-01  3.5 hrs  Setup Laravel project + DB migration
2026-05-02  2.0 hrs  Build product module API
2026-05-03  4.0 hrs  Frontend POS interface
2026-05-04  1.5 hrs  Testing + bug fix
─────────────────────────────────────────────────
Total: 11 hrs
Contract Value: RM 8,000
Effective Rate: RM 727/hr
```

> Gunakan time log untuk estimate projek akan datang berdasarkan pattern jam kerja sebenar.

---

## 6. COST TRACKER (Expenses) — Cara Guna

Cost Tracker untuk **rekod kos operasi** yang berkaitan dengan projek — server, domain, software, dll.

### 6.1 Fungsi Cost Tracker

- Track semua kos yang keluar untuk projek
- Kira **Contract Value bersih** = total milestone − total expenses
- Tunjuk sebenar keuntungan selepas tolak kos
- Export dalam CSV untuk rekod perakaunan

### 6.2 Tambah Expense

Klik `Add Expense` dalam project detail.

| Field | Required | Notes |
|-------|----------|-------|
| Date | ✓ | Tarikh kos berlaku |
| Category | ✓ | Server / Domain / Software / Other |
| Amount (RM) | ✓ | Jumlah kos |
| Description | ✓ | Nama kos — e.g. "Hetzner VPS" |
| Ref / Invoice # | — | No. invois dari vendor (optional) |

**Quick Fill presets tersedia:**
- Vercel Pro (RM 60)
- Supabase Pro (RM 100)
- Hetzner VPS (RM 30)
- Domain .my (RM 70)
- Domain .com (RM 50)
- Cloudflare (RM 0)
- WhatsApp API (RM 99)

Klik preset → auto-fill form.

### 6.3 Edit / Delete Expense

Hover pada baris expense → ikon ⚙ (edit) dan 🗑 (delete) muncul.

### 6.4 Kiraan Contract Value

```
Contract Value = Σ Milestone Amounts − Σ Project Expenses

Contoh:
  Total Milestone Value:   RM 10,000
  Server (Hetzner):      −  RM    30
  Domain .my:            −  RM    70
  WhatsApp API:          −  RM    99
                         ──────────
  Contract Value:          RM  9,801
```

> Contract Value ditunjuk dalam header project detail.

### 6.5 Kategori Expense

| Kategori | Contoh |
|----------|--------|
| **Server** | Hetzner, Vercel, AWS, DigitalOcean, Railway |
| **Domain** | .my, .com, .net domain registration |
| **Software** | WhatsApp API, Figma, Notion, tools subscription |
| **Other** | Freelancer fee, printing, misc |

---

## 7. Billing Module

### 7.1 Billing Overview `/billing`

Stats ditunjuk:
- **Revenue YTD** — total cash masuk tahun ini
- **Pending Invoices** — bilangan + jumlah belum collect
- **Draft Quotations** — quotation belum hantar
- **Paid Invoices** — semua masa

Tiga tab: **Invoices** · **Quotations** · **Receipts**

### 7.2 Quotation Flow

```
New Quotation (/billing/quotations/new)
       │
       ├── Link project (optional)
       ├── Client Name + Email + BRN + Phone
       ├── Valid Until
       ├── Line items (description + qty + unit price)
       └── Notes / T&C
            │
            ▼
       Quotation Detail (/billing/quotations/:id)
            │
            ├── Download PDF
            ├── Edit
            ├── Duplicate
            ├── Mark as Sent
            ├── Mark as Accepted / Rejected
            └── Convert to Invoice
                  ├── Select billing stage (Deposit/Progress/Final/Monthly)
                  └── Amount auto-calculated dari quotation total
```

**Status Quotation:**
`Draft → Sent → Accepted → (Convert to Invoice)`
`Draft → Sent → Rejected`

> Convert to Invoice boleh dilakukan dari status **Sent** atau **Accepted**.

### 7.3 Invoice Flow

```
New Invoice (/billing/invoices/new)
       │
       ├── Select Project (optional)
       │     └── App auto-kira amount dari milestone total
       ├── Select System Type (optional — auto-fill item description)
       └── Select Billing Stage:
             ├── Deposit (50% dari milestone total)
             ├── Progress (25%)
             ├── Handover (25%)
             └── Monthly Retainer (custom amount)
            │
            ▼
       Invoice Detail (/billing/invoices/:id)
            │
            ├── Download PDF
            ├── Edit (Draft only)
            ├── Mark as Sent
            ├── Record Payment → Receipt auto-created
            └── Void Invoice (dengan confirmation)
```

**Status Invoice:**
`Draft → Sent → Paid`
`Draft/Sent → Void`

**Partial Payment:**
- Record payment sekali untuk deposit
- Invoice kekal "Sent" dengan progress bar
- Record lagi untuk baki
- Auto → Paid bila 100% settled

### 7.4 Receipt Flow

```
Invoice Detail → Payment History → Click receipt link
       │
       ▼
Receipt Detail (/billing/receipts/:id)
       ├── Receipt Number (RCP-YYYY-XXXX)
       ├── Amount Paid
       ├── Payment Method
       ├── Payment Date
       ├── Client Name + BRN
       ├── Linked Invoice
       ├── Download Receipt PDF
       └── Void Receipt (jika salah record)
```

---

## 8. Analytics `/analytics`

| Kad | Data | Maksud |
|-----|------|--------|
| Cash Received (YTD) | Σ paid receipts tahun ini | Wang sebenar masuk bank |
| Incoming (Pending) | Σ Draft + Sent invoices | Wang yang patut masuk tapi belum |
| Paid Milestones | Count milestone status=Paid | Jumlah kerja yang dah settled |

**Revenue Chart** — bar chart bulanan (Jan–Dis). Hover untuk exact amount.

**Action Items** — alert untuk:
- 🟡 `Needs Invoice` — milestone Completed tapi belum ada invoice
- 🔴 `Awaiting Payment` — milestone Invoiced, invoice belum paid

Klik action item → terus ke halaman buat invoice untuk project tersebut.

---

## 9. Settings `/settings`

Maklumat ni digunakan dalam **semua PDF** (Invoice, Quotation, Receipt):

| Field | Penting |
|-------|---------|
| Company Name | ✓ Muncul dalam header PDF |
| Address | ✓ Muncul dalam PDF |
| Contact No + Email | ✓ Contact info dalam PDF |
| BRN | — No. pendaftaran syarikat |
| SST Number + Enable SST | — Jika SST registered |
| Bank Name + Account + SWIFT | ✓ Payment info dalam PDF |
| Logo URL | — Logo syarikat dalam PDF |

> **Pastikan Settings lengkap** sebelum hantar dokumen ke client.

---

## 10. Full Client Lifecycle

```
New Client
    │
    ▼
Create Project → Add Milestones (set amounts)
    │
    ▼
Client minta quotation?
    ├── YES → Generate Quotation → Send PDF → Client Accept
    │               └── Convert to Invoice
    └── NO  → Create Invoice terus
    │
    ▼
Mark Invoice as Sent → Client bayar
    │
    ▼
Record Payment
    ├── Partial → progress bar update → record lagi
    └── Full → Invoice auto PAID → Receipt generated
    │
    ▼
Download Receipt PDF → Hantar ke client
    │
    ▼
Milestone auto → PAID
Analytics updated (Cash Received naik)
    │
    ▼
Project Complete ✓
```

---

## 11. Quick Reference

| URL | Fungsi |
|-----|--------|
| `/` | Dashboard |
| `/projects` | Senarai projek |
| `/projects/new` | Buat projek baru |
| `/projects/:id` | Detail projek |
| `/billing` | Invoices + Quotations + Receipts |
| `/billing/invoices/new` | Jana invoice |
| `/billing/invoices/:id` | View / bayar invoice |
| `/billing/quotations/new` | Jana quotation |
| `/billing/quotations/:id` | View / convert quotation |
| `/billing/receipts/:id` | View receipt |
| `/analytics` | Revenue + action items |
| `/settings` | Company info + bank |

**Numbering auto:**
- Invoice → `INV-2026-0001`
- Quotation → `QUO-2026-0001`
- Receipt → `RCP-2026-0001`

**Milestone Status:** `Pending → In Progress → Completed → Invoiced → Paid`

**Invoice Status:** `Draft → Sent → Paid` atau `→ Void`

**Quotation Status:** `Draft → Sent → Accepted/Rejected`
