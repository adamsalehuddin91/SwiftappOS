
export type ProjectStatus = 'Drafting' | 'Dev' | 'UAT' | 'Live';

export type MilestoneStatus = 'Pending' | 'In Progress' | 'Completed' | 'Invoiced' | 'Paid';

export interface Project {
    id: string;
    name: string;
    description?: string;
    status: ProjectStatus;
    sow_details?: string;
    created_at: string;
    updated_at: string;
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
}

export type InvoiceType = 'Deposit' | 'Progress' | 'Final';

export interface Invoice {
    id: string;
    project_id: string;
    milestone_id?: string;
    invoice_number: string;
    type: InvoiceType;
    amount: number;
    status: 'Draft' | 'Sent' | 'Paid' | 'Void';
    created_at: string;
}

export interface Quotation {
    id: string;
    project_id?: string;
    quotation_number: string;
    items: any[]; // refined later
    total_amount: number;
    status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
    created_at: string;
}
