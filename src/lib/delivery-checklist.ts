/**
 * Handover checklist for a completed project.
 *
 * Two kinds of line:
 *   - derived   — answered from the data already in the system (milestones,
 *                 invoices, quotations). These are facts, not opinions.
 *   - handover  — the manual steps nothing in the database can prove. They are
 *                 emitted as "todo" and stay tickable after completion.
 *
 * The result is stored on the project, not recomputed on read: the list handed
 * to a client on the day of delivery should not change later because an invoice
 * was voided in March.
 */

export type ChecklistItemStatus = "done" | "todo" | "blocked";

export interface ChecklistItem {
  key: string;
  label: string;
  kind: "derived" | "handover";
  status: ChecklistItemStatus;
  detail?: string;
}

export interface ChecklistInput {
  projectStatus: string;
  milestones: { name: string; status: string; amount: number }[];
  invoices: { invoiceNumber: string; status: string; amount: number; paid: number }[];
  quotations: { quotationNumber: string; status: string }[];
  costCount: number;
}

export interface DeliveryChecklist {
  generatedAt: string;
  blockers: string[];
  items: ChecklistItem[];
  summary: {
    milestonesTotal: number;
    milestonesSettled: number;
    invoicedTotal: number;
    collectedTotal: number;
    outstandingTotal: number;
  };
}

const SETTLED_MILESTONE = new Set(["Completed", "Invoiced", "Paid"]);

/** Manual steps. Written down so they stop living only in Adam's head. */
const HANDOVER_ITEMS: ReadonlyArray<{ key: string; label: string; detail?: string }> = [
  {
    key: "handover-infra-ownership",
    label: "Infra dipindah ke akaun client",
    detail:
      "Cloudflare / Supabase / Vercel bawah email client, bukan akaun personal — handover bersih + elak limit ToS.",
  },
  { key: "handover-repo-access", label: "Akses repo / kod sumber diserahkan" },
  { key: "handover-domain-dns", label: "Domain + DNS ditala dan didokumen" },
  {
    key: "handover-secrets",
    label: "Env vars & secret diserah melalui saluran selamat",
    detail: "Jangan hantar dalam chat biasa. Tukar apa-apa secret yang pernah dikongsi masa dev.",
  },
  { key: "handover-admin-account", label: "Akaun admin client dibuat, akaun dev dibuang" },
  { key: "handover-backup", label: "Jadual backup disahkan berjalan" },
  { key: "handover-training", label: "Sesi walkthrough / training dengan client selesai" },
  { key: "handover-docs", label: "Manual pengguna / SOP diserahkan" },
  {
    key: "handover-warranty",
    label: "Tempoh waranti & skop sokongan dinyatakan bertulis",
    detail: "Tarikh mula + apa yang termasuk. Tanpa ini setiap permintaan selepas ini jadi kerja percuma.",
  },
];

export function buildDeliveryChecklist(input: ChecklistInput): DeliveryChecklist {
  const items: ChecklistItem[] = [];
  const blockers: string[] = [];

  // ── Derived: project stage ───────────────────────────────────────────
  const isLive = input.projectStatus === "Live";
  items.push({
    key: "stage-live",
    label: "Projek sudah Live",
    kind: "derived",
    status: isLive ? "done" : "blocked",
    detail: isLive ? undefined : `Status semasa: ${input.projectStatus}`,
  });
  if (!isLive) blockers.push(`Projek masih di status "${input.projectStatus}", bukan Live.`);

  // ── Derived: milestones ──────────────────────────────────────────────
  const milestonesTotal = input.milestones.length;
  const settled = input.milestones.filter((m) => SETTLED_MILESTONE.has(m.status));
  const outstandingMilestones = input.milestones.filter((m) => !SETTLED_MILESTONE.has(m.status));

  items.push({
    key: "milestones-complete",
    label: "Semua milestone siap",
    kind: "derived",
    status: milestonesTotal === 0 ? "todo" : outstandingMilestones.length === 0 ? "done" : "blocked",
    detail:
      milestonesTotal === 0
        ? "Projek ini tiada milestone direkod."
        : `${settled.length}/${milestonesTotal} selesai` +
          (outstandingMilestones.length
            ? ` — belum: ${outstandingMilestones.map((m) => m.name).join(", ")}`
            : ""),
  });
  if (outstandingMilestones.length > 0) {
    blockers.push(
      `${outstandingMilestones.length} milestone belum siap: ${outstandingMilestones
        .map((m) => m.name)
        .join(", ")}.`
    );
  }

  // ── Derived: billing ─────────────────────────────────────────────────
  const liveInvoices = input.invoices.filter((i) => i.status !== "Void");
  const invoicedTotal = liveInvoices.reduce((sum, i) => sum + i.amount, 0);
  const collectedTotal = liveInvoices.reduce((sum, i) => sum + i.paid, 0);
  const outstandingTotal = invoicedTotal - collectedTotal;
  const unpaid = liveInvoices.filter((i) => i.status !== "Paid");

  items.push({
    key: "invoices-settled",
    label: "Semua invois dijelaskan",
    kind: "derived",
    status: liveInvoices.length === 0 ? "todo" : unpaid.length === 0 ? "done" : "blocked",
    detail:
      liveInvoices.length === 0
        ? "Tiada invois direkod untuk projek ini."
        : unpaid.length === 0
          ? `RM ${collectedTotal.toFixed(2)} dikutip penuh`
          : `Baki RM ${outstandingTotal.toFixed(2)} belum dikutip — ${unpaid
              .map((i) => i.invoiceNumber)
              .join(", ")}`,
  });
  if (outstandingTotal > 0.01) {
    blockers.push(`Baki belum dikutip: RM ${outstandingTotal.toFixed(2)}.`);
  }
  if (liveInvoices.length === 0) {
    blockers.push("Tiada invois langsung untuk projek ini — sahkan projek ini memang tidak dicaj.");
  }

  // ── Derived: paperwork ───────────────────────────────────────────────
  const accepted = input.quotations.filter((q) => q.status === "Accepted");
  items.push({
    key: "quotation-accepted",
    label: "Quotation diterima client",
    kind: "derived",
    status: accepted.length > 0 ? "done" : "todo",
    detail:
      accepted.length > 0
        ? accepted.map((q) => q.quotationNumber).join(", ")
        : "Tiada quotation berstatus Accepted — skop tidak terikat pada dokumen bertulis.",
  });

  items.push({
    key: "costs-recorded",
    label: "Kos projek direkod (untung bersih boleh dikira)",
    kind: "derived",
    status: input.costCount > 0 ? "done" : "todo",
    detail: input.costCount > 0 ? `${input.costCount} rekod kos` : "Belum ada kos direkod.",
  });

  // ── Handover ─────────────────────────────────────────────────────────
  for (const item of HANDOVER_ITEMS) {
    items.push({ ...item, kind: "handover", status: "todo" });
  }

  return {
    generatedAt: new Date().toISOString(),
    blockers,
    items,
    summary: {
      milestonesTotal,
      milestonesSettled: settled.length,
      invoicedTotal,
      collectedTotal,
      outstandingTotal,
    },
  };
}
