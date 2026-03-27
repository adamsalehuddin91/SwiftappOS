export type ProjectStatus = "Drafting" | "Dev" | "UAT" | "Live";

export type MilestoneStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Invoiced"
  | "Paid";

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  sow_details?: string;
  client_name?: string;
  client_email?: string;
  client_brn?: string;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
  progress?: number;
  totalMilestones?: number;
  completedMilestones?: number;

  milestones?: Milestone[];
  timeLogs?: TimeLog[];
  costs?: ProjectCost[];
}

export interface Milestone {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  status: MilestoneStatus;
  amount: number;
  due_date?: string;
  created_at: string;

  timeLogs?: TimeLog[];
}

export type InvoiceType = "Deposit" | "Progress" | "Final" | "Monthly";

export interface Invoice {
  id: string;
  project_id: string;
  milestone_id?: string;
  invoice_number: string;
  type: InvoiceType;
  amount: number;
  status: "Draft" | "Sent" | "Paid" | "Void";
  due_date?: string;
  items?: QuotationItem[];
  client_name?: string;
  client_email?: string;
  client_brn?: string;
  notes?: string;
  project_name?: string;
  created_at: string;
  updated_at?: string;
  receipts?: Receipt[];
}

export interface Quotation {
  id: string;
  project_id?: string;
  quotation_number: string;
  client_name: string;
  client_email?: string;
  client_brn?: string;
  items: QuotationItem[];
  total_amount: number;
  status: "Draft" | "Sent" | "Accepted" | "Rejected";
  valid_until?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface QuotationItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface Receipt {
  id: string;
  invoiceId: string;
  receiptNumber: string;
  amountPaid: number;
  paymentMethod?: string;
  paymentDate: string;
  created_at: string;
}

export interface DashboardStats {
  activeProjects: number;
  pendingMilestones: number;
  revenueYtd: number;
  recentProjects: {
    id: string;
    name: string;
    status: ProjectStatus;
    currentMilestone: string | null;
  }[];
  overdueInvoices?: {
    id: string;
    invoiceNumber: string;
    amount: number;
    dueDate: string | null;
    projectName: string;
    daysPastDue: number;
  }[];
}

export interface AnalyticsData {
  netProfit: number;
  pendingInvoiceCount: number;
  pendingInvoiceTotal: number;
  paidMilestoneCount: number;
  monthlyRevenue: { month: string; amount: number }[];
  pendingMilestones: {
    id: string;
    name: string;
    projectName: string;
    amount: number;
    status: string;
  }[];
}

export type CostCategory = "Server" | "Domain" | "Software" | "Other";

export interface TimeLog {
  id: string;
  projectId: string;
  milestoneId: string | null;
  hours: number;
  description: string;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectCost {
  id: string;
  projectId: string;
  category: CostCategory;
  amount: number;
  description: string;
  date: string;
  reference: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
