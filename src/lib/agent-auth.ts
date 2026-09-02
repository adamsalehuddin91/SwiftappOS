/**
 * Machine-caller authentication for the Hermes agent.
 *
 * Runs inside middleware (Edge runtime), so this file may only use Web Crypto —
 * no `node:crypto`, no Prisma. The primitives live in `crypto-edge.ts`.
 *
 * The agent authenticates with `Authorization: Bearer <AGENT_API_TOKEN>` instead
 * of the browser session cookie, and is confined to the routes listed below.
 * Anything not on the list is refused, so a leaked token cannot delete an
 * invoice, rewrite company settings, or upload a logo.
 */

export const MIN_AGENT_TOKEN_LENGTH = 32;

const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

/**
 * Everything the agent may do. Deliberately excludes:
 *   - every DELETE (invoices, quotations, projects, milestones, costs)
 *   - /api/settings/* (company details, bank account, logo upload)
 *   - /api/auth/*
 *   - PUT edits to quotation/invoice bodies — the agent moves things through
 *     the workflow, it does not rewrite the numbers on a document.
 */
const AGENT_ROUTES: ReadonlyArray<{ method: string; pattern: RegExp }> = [
  { method: "GET", pattern: new RegExp(`^/api/dashboard$`) },
  { method: "GET", pattern: new RegExp(`^/api/analytics$`) },
  { method: "GET", pattern: new RegExp(`^/api/billing/stats$`) },

  { method: "GET", pattern: new RegExp(`^/api/projects$`) },
  { method: "POST", pattern: new RegExp(`^/api/projects$`) },
  { method: "GET", pattern: new RegExp(`^/api/projects/${UUID}$`) },
  { method: "PUT", pattern: new RegExp(`^/api/projects/${UUID}$`) },
  { method: "POST", pattern: new RegExp(`^/api/projects/${UUID}/complete$`) },

  { method: "GET", pattern: new RegExp(`^/api/milestones/due$`) },
  { method: "POST", pattern: new RegExp(`^/api/milestones$`) },
  { method: "PUT", pattern: new RegExp(`^/api/milestones/${UUID}$`) },

  { method: "GET", pattern: new RegExp(`^/api/quotations$`) },
  { method: "GET", pattern: new RegExp(`^/api/quotations/${UUID}$`) },
  { method: "PATCH", pattern: new RegExp(`^/api/quotations/${UUID}$`) },
  { method: "POST", pattern: new RegExp(`^/api/quotations/${UUID}/convert$`) },

  { method: "GET", pattern: new RegExp(`^/api/invoices$`) },
  { method: "POST", pattern: new RegExp(`^/api/invoices$`) },
  { method: "GET", pattern: new RegExp(`^/api/invoices/${UUID}$`) },
  { method: "PATCH", pattern: new RegExp(`^/api/invoices/${UUID}$`) },
  { method: "GET", pattern: new RegExp(`^/api/invoices/${UUID}/receipts$`) },
  { method: "POST", pattern: new RegExp(`^/api/invoices/${UUID}/receipts$`) },
];

export function isAgentRouteAllowed(method: string, pathname: string): boolean {
  return AGENT_ROUTES.some(
    (route) => route.method === method.toUpperCase() && route.pattern.test(pathname)
  );
}
