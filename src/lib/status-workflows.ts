const INVOICE_TRANSITIONS: Record<string, string[]> = {
  Draft: ["Sent", "Void"],
  Sent: ["Paid", "Void"],
  Paid: [],
  Void: [],
};

const QUOTATION_TRANSITIONS: Record<string, string[]> = {
  Draft: ["Sent"],
  Sent: ["Accepted", "Rejected"],
  Accepted: [],
  Rejected: [],
};

const MILESTONE_TRANSITIONS: Record<string, string[]> = {
  Pending: ["In Progress"],
  "In Progress": ["Completed"],
  Completed: ["Invoiced"],
  Invoiced: ["Paid"],
  Paid: [],
};

type WorkflowType = "invoice" | "quotation" | "milestone";

const WORKFLOWS: Record<WorkflowType, Record<string, string[]>> = {
  invoice: INVOICE_TRANSITIONS,
  quotation: QUOTATION_TRANSITIONS,
  milestone: MILESTONE_TRANSITIONS,
};

export function validateTransition(
  type: WorkflowType,
  currentStatus: string,
  newStatus: string
): { valid: boolean; allowed: string[] } {
  const transitions = WORKFLOWS[type];
  const allowed = transitions[currentStatus] ?? [];
  return {
    valid: allowed.includes(newStatus),
    allowed,
  };
}

export function getAllowedTransitions(
  type: WorkflowType,
  currentStatus: string
): string[] {
  const transitions = WORKFLOWS[type];
  return transitions[currentStatus] ?? [];
}
