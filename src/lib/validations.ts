import { z } from "zod";

// ── Enums ──────────────────────────────────────────────

export const ProjectStatusEnum = z.enum(["Drafting", "Dev", "UAT", "Live"]);
export const MilestoneStatusEnum = z.enum(["Pending", "In Progress", "Completed", "Invoiced", "Paid"]);
export const InvoiceStatusEnum = z.enum(["Draft", "Sent", "Paid", "Void"]);
export const InvoiceTypeEnum = z.enum(["Deposit", "Progress", "Final", "Monthly"]);
export const QuotationStatusEnum = z.enum(["Draft", "Sent", "Accepted", "Rejected"]);
export const CostCategoryEnum = z.enum(["Server", "Domain", "Software", "Other"]);

// ── Projects ───────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200),
  description: z.string().max(2000).optional(),
  status: ProjectStatusEnum.optional(),
  sowDetails: z.string().max(10000).optional(),
  clientName: z.string().max(200).optional(),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  clientBrn: z.string().max(50).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: ProjectStatusEnum.optional(),
  sowDetails: z.string().max(10000).optional().nullable(),
  clientName: z.string().max(200).optional().nullable(),
  clientEmail: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  clientBrn: z.string().max(50).optional().nullable(),
  isArchived: z.boolean().optional(),
});

// ── Milestones ─────────────────────────────────────────

export const createMilestoneSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  name: z.string().min(1, "Milestone name is required").max(200),
  description: z.string().max(2000).optional(),
  amount: z.coerce.number().min(0, "Amount must be 0 or more").default(0),
  dueDate: z.string().optional().nullable(),
});

export const updateMilestoneSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  status: MilestoneStatusEnum.optional(),
  amount: z.coerce.number().min(0).optional(),
  dueDate: z.string().optional().nullable(),
});

// ── Invoices ───────────────────────────────────────────

export const createInvoiceSchema = z.object({
  projectId: z.string().uuid("Invalid project ID"),
  milestoneId: z.string().uuid().optional().nullable(),
  type: InvoiceTypeEnum,
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  dueDate: z.string().optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
  })).optional(),
  clientName: z.string().max(200).optional().nullable(),
  clientEmail: z.string().email().optional().nullable().or(z.literal("")),
  clientBrn: z.string().max(50).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateInvoiceSchema = z.object({
  type: InvoiceTypeEnum.optional(),
  amount: z.coerce.number().positive().optional(),
  dueDate: z.string().optional().nullable(),
  items: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().min(0),
  })).optional(),
  clientName: z.string().max(200).optional().nullable(),
  clientEmail: z.string().email().optional().nullable().or(z.literal("")),
  clientBrn: z.string().max(50).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export const updateInvoiceStatusSchema = z.object({
  status: InvoiceStatusEnum,
});

// ── Quotations ─────────────────────────────────────────

const quotationItemSchema = z.object({
  description: z.string().min(1, "Item description required"),
  quantity: z.number().positive("Quantity must be > 0"),
  unitPrice: z.number().min(0, "Price cannot be negative"),
});

export const createQuotationSchema = z.object({
  projectId: z.string().uuid().optional().nullable(),
  clientName: z.string().min(1, "Client name is required").max(200),
  clientEmail: z.string().email().optional().nullable().or(z.literal("")),
  clientBrn: z.string().max(50).optional().nullable(),
  clientPhone: z.string().max(50).optional().nullable(),
  items: z.array(quotationItemSchema).min(1, "At least one item required"),
  notes: z.string().max(5000).optional().nullable(),
  validUntil: z.string().optional().nullable(),
});

export const updateQuotationSchema = z.object({
  clientName: z.string().min(1).max(200).optional(),
  clientEmail: z.string().email().optional().nullable().or(z.literal("")),
  clientBrn: z.string().max(50).optional().nullable(),
  clientPhone: z.string().max(50).optional().nullable(),
  items: z.array(quotationItemSchema).min(1).optional(),
  notes: z.string().max(5000).optional().nullable(),
  validUntil: z.string().optional().nullable(),
});

export const updateQuotationStatusSchema = z.object({
  status: QuotationStatusEnum,
});

// ── Receipts ───────────────────────────────────────────

export const createReceiptSchema = z.object({
  invoiceId: z.string().uuid("Invalid invoice ID"),
  amountPaid: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.string().max(100).optional().nullable(),
  paymentDate: z.string().optional(),
});

// ── Time Logs ──────────────────────────────────────────

export const createTimeLogSchema = z.object({
  milestoneId: z.string().uuid().optional().nullable(),
  hours: z.coerce.number().positive("Hours must be > 0").max(24, "Max 24 hours per entry"),
  description: z.string().min(1, "Description required").max(1000),
  date: z.string().min(1, "Date required"),
});

export const updateTimeLogSchema = z.object({
  hours: z.coerce.number().positive().max(24).optional(),
  description: z.string().min(1).max(1000).optional(),
  date: z.string().optional(),
});

// ── Project Costs ──────────────────────────────────────

export const createProjectCostSchema = z.object({
  category: CostCategoryEnum,
  amount: z.coerce.number().positive("Amount must be > 0"),
  description: z.string().min(1, "Description required").max(1000),
  date: z.string().min(1, "Date required"),
  reference: z.string().max(200).optional().nullable(),
});

export const updateProjectCostSchema = z.object({
  category: CostCategoryEnum.optional(),
  amount: z.coerce.number().positive().optional(),
  description: z.string().min(1).max(1000).optional(),
  date: z.string().optional(),
  reference: z.string().max(200).optional().nullable(),
});

// ── Settings ───────────────────────────────────────────

export const updateSettingsSchema = z.object({
  companyName: z.string().min(1, "Company name required").max(200),
  address: z.string().min(1, "Address required").max(1000),
  contactNo: z.string().min(1, "Contact number required").max(50),
  email: z.string().email("Invalid email"),
  website: z.string().url().optional().nullable().or(z.literal("")),
  brn: z.string().max(50).optional().nullable().or(z.literal("")),
  sstNumber: z.string().max(50).optional().nullable().or(z.literal("")),
  enableSst: z.boolean().default(false),
  bankName: z.string().max(200).optional().nullable().or(z.literal("")),
  bankAccount: z.string().max(100).optional().nullable().or(z.literal("")),
  bankSwift: z.string().max(20).optional().nullable().or(z.literal("")),
  logoUrl: z.string().url().optional().nullable().or(z.literal("")),
});

// ── Pagination ─────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().optional().default(""),
  status: z.string().optional().default(""),
});
