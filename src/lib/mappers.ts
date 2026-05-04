import type {
  Project as PrismaProject,
  Milestone as PrismaMilestone,
  Invoice as PrismaInvoice,
  Quotation as PrismaQuotation,
} from "@/generated/prisma/client";
import type { Project, Milestone, Invoice, Quotation, QuotationItem } from "@/types";

const milestoneStatusMap: Record<string, string> = {
  Pending: "Pending",
  InProgress: "In Progress",
  Completed: "Completed",
  Invoiced: "Invoiced",
  Paid: "Paid",
};

export function mapProject(p: PrismaProject): Project {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    status: p.status,
    sow_details: p.sowDetails ?? undefined,
    client_name: p.clientName ?? undefined,
    client_email: p.clientEmail ?? undefined,
    client_brn: p.clientBrn ?? undefined,
    is_archived: p.isArchived,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export function mapMilestone(m: PrismaMilestone): Milestone {
  return {
    id: m.id,
    project_id: m.projectId,
    name: m.name,
    description: m.description ?? undefined,
    status: milestoneStatusMap[m.status] as Milestone["status"],
    amount: Number(m.amount),
    due_date: m.dueDate ? m.dueDate.toISOString().split("T")[0] : undefined,
    created_at: m.createdAt.toISOString(),
  };
}

export function mapInvoice(
  inv: PrismaInvoice & { project?: PrismaProject | null }
): Invoice {
  return {
    id: inv.id,
    project_id: inv.projectId ?? undefined,
    milestone_id: inv.milestoneId ?? undefined,
    invoice_number: inv.invoiceNumber,
    type: inv.type,
    amount: Number(inv.amount),
    status: inv.status,
    due_date: inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : undefined,
    items: (inv.items as unknown) as QuotationItem[] | undefined,
    client_name: inv.clientName ?? undefined,
    client_email: inv.clientEmail ?? undefined,
    client_brn: inv.clientBrn ?? undefined,
    notes: inv.notes ?? undefined,
    project_name: inv.project?.name,
    created_at: inv.createdAt.toISOString(),
    updated_at: inv.updatedAt.toISOString(),
  };
}

export function mapQuotation(q: PrismaQuotation): Quotation {
  return {
    id: q.id,
    project_id: q.projectId ?? undefined,
    quotation_number: q.quotationNumber,
    client_name: q.clientName,
    client_email: q.clientEmail ?? undefined,
    client_brn: q.clientBrn ?? undefined,
    client_phone: q.clientPhone ?? undefined,
    items: (q.items as unknown) as QuotationItem[],
    total_amount: Number(q.totalAmount),
    status: q.status,
    valid_until: q.validUntil
      ? q.validUntil.toISOString().split("T")[0]
      : undefined,
    notes: q.notes ?? undefined,
    created_at: q.createdAt.toISOString(),
    updated_at: q.updatedAt.toISOString(),
  };
}
