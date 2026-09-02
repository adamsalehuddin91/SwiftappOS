# Agent API — SwiftApp OS

How the Hermes agent (`tokwi` on the Tencent VPS) talks to SwiftApp OS.

SwiftApp OS is the **ledger**: projects, milestones, quotations, invoices, receipts.
Hermes is the **nervous system**: it listens on Telegram, runs cron, and calls in here.
Leads live in Hermes and only become a `Project` once Adam approves one.

There is no outbound webhook. Every trigger in the flow starts from Adam or from
cron — nothing starts inside SwiftApp OS — so the traffic only ever runs one way.

---

## Authentication

Two ways in, and they do not overlap.

| Caller | Credential | Reach |
|---|---|---|
| Browser | `swiftapp-session` cookie (from `/login`) | Everything |
| Agent | `Authorization: Bearer $AGENT_API_TOKEN` | Only the routes listed below |

The browser cookie is an HMAC-signed token carrying its own expiry: 30 days
absolute, renewed while the browser is actually in use. Each login mints a
distinct token. Sessions are stateless, so logout clears the browser's own copy;
to end every outstanding session at once, rotate `SESSION_SECRET` (or
`SWIFTAPP_PASSWORD`) and redeploy.

`/api/auth/login` is rate limited: 10 wrong passwords per address per 15 minutes,
then `429` with `Retry-After` until the window clears. Agent traffic never touches
that route — it carries the bearer token instead — so the limit cannot lock the
agent out.

```bash
curl -sS https://os.example.my/api/milestones/due?days=3 \
  -H "Authorization: Bearer $AGENT_API_TOKEN"
```

Set `AGENT_API_TOKEN` in the Coolify environment. **Minimum 32 characters** — the
app returns `503` rather than accept a short one.

```bash
openssl rand -hex 32
```

### Failure responses

| Situation | Response |
|---|---|
| No credential on `/api/*` | `401 {"error":"Not authenticated."}` |
| Bad bearer token | `401 {"error":"Invalid agent token."}` |
| Valid token, route not on the allowlist | `403` naming the method and path |
| Valid token, non-API path | `403` |
| `AGENT_API_TOKEN` unset or under 32 chars | `503` |
| `SWIFTAPP_PASSWORD` unset in production | `503` — the app refuses to serve |

`/api/*` always answers with JSON. It never redirects to the login page: a `307`
to an HTML page reads as success to `curl` and to the agent, so a write that never
happened used to look like one that did.

---

## What the agent may do

Everything else is refused, including **every `DELETE`**, all of `/api/settings/*`
(company details, bank account, logo), and `PUT` edits to invoice and quotation
bodies. The agent moves documents through the workflow; it does not rewrite the
numbers printed on them.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/agent/status` | Counts and totals only — no names, no ids |
| `GET` | `/api/audit` | Recent writes: actor, action, before/after |
| `GET` | `/api/dashboard` | Overdue invoices, pending milestones |
| `GET` | `/api/analytics` | Cashflow — collected, pending, monthly |
| `GET` | `/api/billing/stats` | Billing summary |
| `GET` `POST` | `/api/projects` | List / create |
| `GET` `PUT` | `/api/projects/{id}` | Read / update (status, client details) |
| `POST` | `/api/projects/{id}/complete` | Close project + freeze checklist |
| `GET` | `/api/milestones/due?days=N` | Due + overdue milestones |
| `POST` | `/api/milestones` | Create |
| `PUT` | `/api/milestones/{id}` | Update (status transitions enforced) |
| `GET` `POST` | `/api/quotations` | List / draft a new one (always `Draft`) |
| `GET` `PATCH` | `/api/quotations/{id}` | Read / change status |
| `POST` | `/api/quotations/{id}/convert` | Quotation → invoice |
| `GET` `POST` | `/api/invoices` | List / create |
| `GET` `PATCH` | `/api/invoices/{id}` | Read / change status |
| `GET` `POST` | `/api/invoices/{id}/receipts` | Read / record payment |
| `GET` | `/api/receipts` | All receipts, newest first |

The allowlist lives in `src/lib/agent-auth.ts`. Add a route there and here, or it
stays shut.

### Two further limits, applied inside the routes

**Quotations may be drafted, not edited.** `POST /api/quotations` is open;
`PUT /api/quotations/{id}` is not. `createQuotationSchema` has no `status` field, so
a new quotation is always `Draft` — moving it to `Sent` takes a separate, deliberate
`PATCH`. The agent drafts once and a human edits the numbers in the browser.

**Writes are status-only.** `PUT /api/projects/{id}` and `PUT /api/milestones/{id}`
take a whole record, so without this the agent could rewrite a milestone's amount —
RM1,000 into RM100 — while nominally updating a status. Any field other than
`status` is refused with `403`. The browser is unaffected.

**Responses are redacted.** `client_email`, `client_phone`, `client_brn`,
`sow_details`, `notes` and `description` are stripped from everything the agent
reads, nested shapes included. Its flows need names, amounts and dates; none of
them need a way to contact a client. A leaked token cannot become a contact list.
Widen the list in `src/lib/agent-guard.ts` only when a real flow needs a field.

### Every write is logged

`audit_log` records entity, action, actor (`agent` or `browser`), and before/after
snapshots. `projects`, `invoices` and `receipts` also carry `created_by`, so "where
did this invoice come from?" has an answer without a log lookup. Payments log inside
the same transaction as the money; everything else logs best-effort after the write,
and never fails the operation it describes.

Attach `X-Agent-Source: <text>` to a write and it lands in the log's `source`
column. It is self-reported, so it is context for a human reading the log — never
a control.

---

## Idempotency — required on payments

The agent retries when the network times out, but the first attempt may already
have committed. Send `X-Idempotency-Key` on every `POST` that moves money.

```bash
curl -sS -X POST "$BASE/api/invoices/$INVOICE_ID/receipts" \
  -H "Authorization: Bearer $AGENT_API_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -d '{"amount":1000,"paymentMethod":"transfer"}'
```

Generate the key **once per real-world event** and reuse it across retries. A new
key per retry defeats the whole thing.

| Case | Result |
|---|---|
| Same key, same body | The stored response replays, `x-idempotent-replay: true` |
| Same key, different body | `422` — the key was reused by mistake |
| Same key, first call still running | `409` — back off and retry |
| No key | Runs normally (this is what the browser does) |

Beyond the key, the payment route takes a `SELECT … FOR UPDATE` on the invoice row,
so two payments that arrive together are serialised rather than both reading a
stale paid-to-date total.

`POST /api/projects` and `POST /api/invoices` accept the same header.

Invoice creation additionally refuses a near-duplicate: same project, type and
amount within ten minutes answers `409` naming the existing invoice, because
invoice numbers are sequential and permanent and a phantom one leaves a debt on the
client's account. Send `{"allowDuplicate": true}` when a second is genuinely
intended. The check runs *inside* the idempotency wrapper — a keyed retry is the
one duplicate that is legitimate, and checking first would refuse the very case the
key exists to make safe.

---

## Recording a payment

`POST /api/invoices/{id}/receipts`

```json
{ "amount": 1000, "paymentMethod": "transfer", "paymentDate": "2026-09-02" }
```

```json
{
  "receipt": { "id": "…", "receiptNumber": "RCP-2026-0007", "amountPaid": 1000 },
  "invoice": { "invoiceNumber": "INV-2026-0012", "status": "Paid", "remaining": 0 },
  "milestonesMarkedPaid": 1,
  "unlinkedInvoicedMilestones": 0
}
```

**Cashflow needs no second call.** The analytics figure is `SUM(receipts.amount_paid)` —
creating the receipt *is* the cashflow update. Writing anything else would double-count.

`unlinkedInvoicedMilestones` counts milestones on the project that are `Invoiced`
but carry no billing link — invoices raised before the link existed. They cannot be
attributed to a payment, so they are reported rather than guessed at. Anything above
zero needs a human to mark it.

---

## Due milestones

`GET /api/milestones/due?days=3` — read-only, the reminder cron's only call.
`days` is clamped to 90. Milestones on archived or completed projects are excluded.

```json
{
  "windowDays": 3,
  "counts": { "total": 2, "overdue": 1, "dueSoon": 1 },
  "overdueAmount": 1500,
  "milestones": [
    { "name": "Fasa 2 — UAT", "dueDate": "2026-08-30", "daysUntilDue": -3,
      "overdue": true, "projectName": "MessyMates 2A", "clientName": "…", "amount": 1500 }
  ]
}
```

---

## Completing a project

`POST /api/projects/{id}/complete`

```json
{ "dryRun": true }
```

Builds the checklist and writes nothing — use it to preview blockers.

Without `dryRun`, blockers refuse the call with `409` and list them: project not
`Live`, milestones unfinished, or a balance still uncollected. Closing a project
with money outstanding is a decision, so it takes `{"force": true}`.

The stored checklist has two kinds of line. **Derived** lines are answered from the
data (milestones settled, invoices paid, quotation accepted). **Handover** lines are
the manual steps nothing in the database can prove — infra moved to the client's own
account, repo access, DNS, secrets rotated, admin account created and the dev account
removed, backups verified, training done, warranty period written down.

The checklist is stored on the project, not recomputed on read. The list handed over
on delivery day should not change later because an invoice was voided in March.
