// Integration test for the agent API. Writes real rows — point it at a scratch
// deployment, never at production.
//
//   SWIFTOS_BASE_URL=http://localhost:3000 AGENT_API_TOKEN=<token> npm run test:agent
try { (await import("dotenv")).default.config({ quiet: true }); } catch { /* optional */ }
const BASE = process.env.SWIFTOS_BASE_URL || "http://localhost:3000";
const TOKEN = process.env.AGENT_API_TOKEN || "local-test-agent-token-0123456789abcdef";
const PASSWORD = process.env.SWIFTAPP_PASSWORD || "test-pw-local-only";
const H = { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` };

let pass = 0, fail = 0;
const ok = (name, cond, extra = "") => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${extra}`); }
};

const api = async (path, init = {}) => {
  const res = await fetch(BASE + path, { ...init, headers: { ...H, ...(init.headers || {}) }, redirect: "manual" });
  let body = null;
  try { body = await res.json(); } catch { body = null; }
  return { status: res.status, body, headers: res.headers };
};

console.log("\n== 1. AUTH ==");
{
  const r = await fetch(`${BASE}/api/projects`, { redirect: "manual" });
  ok("no auth on /api -> 401 (was 307 to HTML login)", r.status === 401, `got ${r.status}`);
  const ct = r.headers.get("content-type") || "";
  ok("401 body is JSON", ct.includes("application/json"), ct);
}
{
  const r = await fetch(`${BASE}/api/projects`, { headers: { Authorization: "Bearer wrong-token-wrong-token-wrong-tok" }, redirect: "manual" });
  ok("wrong bearer -> 401", r.status === 401, `got ${r.status}`);
}
{
  const r = await api("/api/projects");
  ok("valid bearer -> 200", r.status === 200, `got ${r.status}`);
}
{
  const r = await api("/api/settings");
  ok("agent blocked from /api/settings -> 403", r.status === 403, `got ${r.status}`);
}
{
  const r = await api("/api/invoices/11111111-1111-1111-1111-111111111111", { method: "DELETE" });
  ok("agent blocked from DELETE -> 403", r.status === 403, `got ${r.status}`);
}
{
  const r = await fetch(`${BASE}/projects`, { headers: { Authorization: `Bearer ${TOKEN}` }, redirect: "manual" });
  ok("agent token rejected on non-API page -> 403", r.status === 403, `got ${r.status}`);
}

console.log("\n== 2. MILESTONE SCOPING (the double-flip bug) ==");
const proj = (await api("/api/projects", { method: "POST", body: JSON.stringify({ name: `AgentTest ${Date.now()}`, clientName: "Ujian Sdn Bhd", status: "Live" }) })).body;
ok("project created", !!proj?.id, JSON.stringify(proj));

const mk = async (name, dueDate) => (await api("/api/milestones", { method: "POST", body: JSON.stringify({ projectId: proj.id, name, amount: 1000, dueDate }) })).body;
const m1 = await mk("Fasa 1", null);
const m2 = await mk("Fasa 2", null);
ok("2 milestones created", !!m1?.id && !!m2?.id);

const advance = async (id, status) => api(`/api/milestones/${id}`, { method: "PUT", body: JSON.stringify({ status }) });
for (const m of [m1, m2]) {
  await advance(m.id, "In Progress");
  await advance(m.id, "Completed");
}

const invA = (await api("/api/invoices", { method: "POST", body: JSON.stringify({ projectId: proj.id, milestoneIds: [m1.id], type: "Deposit", amount: 1000 }) })).body;
const invB = (await api("/api/invoices", { method: "POST", body: JSON.stringify({ projectId: proj.id, milestoneIds: [m2.id], type: "Progress", amount: 2000 }) })).body;
ok("2 invoices created", !!invA?.id && !!invB?.id, JSON.stringify(invA));

const payA = await api(`/api/invoices/${invA.id}/receipts`, { method: "POST", body: JSON.stringify({ amount: 1000, paymentMethod: "transfer" }) });
ok("invoice A paid -> 201", payA.status === 201, `got ${payA.status} ${JSON.stringify(payA.body)}`);
ok("only 1 milestone marked Paid", payA.body?.milestonesMarkedPaid === 1, `got ${payA.body?.milestonesMarkedPaid}`);
ok("no unattributable milestones", payA.body?.unlinkedInvoicedMilestones === 0, `got ${payA.body?.unlinkedInvoicedMilestones}`);

const after = (await api(`/api/projects/${proj.id}`)).body;
const s1 = after.milestones.find((m) => m.id === m1.id)?.status;
const s2 = after.milestones.find((m) => m.id === m2.id)?.status;
ok("milestone billed on the PAID invoice -> Paid", s1 === "Paid", `got ${s1}`);
ok("milestone billed on the UNPAID invoice stays Invoiced", s2 === "Invoiced", `got ${s2} (old code flipped this to Paid)`);

console.log("\n== 3. IDEMPOTENCY ==");
const invC = (await api("/api/invoices", { method: "POST", body: JSON.stringify({ projectId: proj.id, type: "Final", amount: 500 }) })).body;
const key = `test-key-${Date.now()}`;
const p1 = await api(`/api/invoices/${invC.id}/receipts`, { method: "POST", headers: { "X-Idempotency-Key": key }, body: JSON.stringify({ amount: 500 }) });
const p2 = await api(`/api/invoices/${invC.id}/receipts`, { method: "POST", headers: { "X-Idempotency-Key": key }, body: JSON.stringify({ amount: 500 }) });
ok("first keyed payment -> 201", p1.status === 201, `got ${p1.status}`);
ok("retry replays same status", p2.status === 201, `got ${p2.status}`);
ok("retry replays SAME receipt", p1.body?.receipt?.id === p2.body?.receipt?.id, `${p1.body?.receipt?.id} vs ${p2.body?.receipt?.id}`);
ok("replay flagged in header", p2.headers.get("x-idempotent-replay") === "true");
const rcC = (await api(`/api/invoices/${invC.id}/receipts`)).body;
ok("exactly 1 receipt stored", Array.isArray(rcC) && rcC.length === 1, `got ${rcC?.length}`);

{
  const invD = (await api("/api/invoices", { method: "POST", body: JSON.stringify({ projectId: proj.id, type: "Final", amount: 300 }) })).body;
  const k2 = `test-key-par-${Date.now()}`;
  const [a, b] = await Promise.all([
    api(`/api/invoices/${invD.id}/receipts`, { method: "POST", headers: { "X-Idempotency-Key": k2 }, body: JSON.stringify({ amount: 300 }) }),
    api(`/api/invoices/${invD.id}/receipts`, { method: "POST", headers: { "X-Idempotency-Key": k2 }, body: JSON.stringify({ amount: 300 }) }),
  ]);
  const rc = (await api(`/api/invoices/${invD.id}/receipts`)).body;
  ok("concurrent same-key -> exactly 1 receipt", rc.length === 1, `receipts=${rc.length}, statuses=${a.status}/${b.status}`);
  ok("one call refused or replayed", [a.status, b.status].some((s) => s === 409 || s === 201), `${a.status}/${b.status}`);
  const wrong = await api(`/api/invoices/${invD.id}/receipts`, { method: "POST", headers: { "X-Idempotency-Key": k2 }, body: JSON.stringify({ amount: 1 }) });
  ok("same key + different body -> 422", wrong.status === 422, `got ${wrong.status}`);
}

console.log("\n== 4. CONCURRENT PAYMENTS, NO KEY (row lock) ==");
{
  const invE = (await api("/api/invoices", { method: "POST", body: JSON.stringify({ projectId: proj.id, type: "Final", amount: 100 }) })).body;
  const [a, b] = await Promise.all([
    api(`/api/invoices/${invE.id}/receipts`, { method: "POST", body: JSON.stringify({ amount: 100 }) }),
    api(`/api/invoices/${invE.id}/receipts`, { method: "POST", body: JSON.stringify({ amount: 100 }) }),
  ]);
  const rc = (await api(`/api/invoices/${invE.id}/receipts`)).body;
  const total = rc.reduce((s, r) => s + Number(r.amountPaid), 0);
  ok("2 concurrent full payments -> 1 receipt only", rc.length === 1, `receipts=${rc.length} statuses=${a.status}/${b.status}`);
  ok("total collected never exceeds invoice", total <= 100, `total=${total}`);
}

console.log("\n== 5. DUE MILESTONES ==");
{
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const soon = new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];
  const far = new Date(Date.now() + 40 * 86400000).toISOString().split("T")[0];
  const mOver = await mk("Overdue milestone", yesterday);
  const mSoon = await mk("Due soon milestone", soon);
  await mk("Far away milestone", far);

  const due = (await api("/api/milestones/due?days=3")).body;
  ok("/api/milestones/due resolves (not shadowed by [id])", Array.isArray(due?.milestones), JSON.stringify(due).slice(0, 120));
  const ids = due.milestones.map((m) => m.id);
  ok("overdue milestone included", ids.includes(mOver.id));
  ok("due-soon milestone included", ids.includes(mSoon.id));
  ok("far milestone excluded", !due.milestones.some((m) => m.name === "Far away milestone"));
  ok("overdue flagged", due.milestones.find((m) => m.id === mOver.id)?.overdue === true);
  ok("counts reported", due.counts?.overdue >= 1 && due.counts?.total >= 2, JSON.stringify(due.counts));
  const clamped = (await api("/api/milestones/due?days=9999")).body;
  ok("days clamped to 90, not 500", clamped?.windowDays === 90, `got ${clamped?.windowDays}`);
}

console.log("\n== 6. PROJECT COMPLETION ==");
{
  const dry = await api(`/api/projects/${proj.id}/complete`, { method: "POST", body: JSON.stringify({ dryRun: true }) });
  ok("dryRun -> 200", dry.status === 200, `got ${dry.status}`);
  ok("dryRun reports blockers (invoice B unpaid)", dry.body?.checklist?.blockers?.length > 0, JSON.stringify(dry.body?.checklist?.blockers));
  ok("dryRun changed nothing", (await api(`/api/projects/${proj.id}`)).body.status === "Live");

  const refused = await api(`/api/projects/${proj.id}/complete`, { method: "POST", body: JSON.stringify({}) });
  ok("blockers refuse completion -> 409", refused.status === 409, `got ${refused.status}`);

  const forced = await api(`/api/projects/${proj.id}/complete`, { method: "POST", body: JSON.stringify({ force: true, notes: "ujian" }) });
  ok("force -> 200", forced.status === 200, `got ${forced.status} ${JSON.stringify(forced.body).slice(0, 200)}`);
  ok("status now Completed", forced.body?.status === "Completed", forced.body?.status);
  ok("checklist has handover items", forced.body?.checklist?.items?.some((i) => i.kind === "handover"));

  const again = await api(`/api/projects/${proj.id}/complete`, { method: "POST", body: JSON.stringify({ force: true }) });
  ok("second completion -> 409", again.status === 409, `got ${again.status}`);

  const dueAfter = (await api("/api/milestones/due?days=3")).body;
  ok("completed project drops out of reminders", !dueAfter.milestones.some((m) => m.projectId === proj.id), JSON.stringify(dueAfter.counts));
}

console.log("\n== 7. SESSION COOKIE ==");
{
  const { webcrypto } = await import("node:crypto");
  const subtle = webcrypto.subtle;
  const enc = new TextEncoder();

  const login = (pw) =>
    fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
      redirect: "manual",
    });

  const cookieFrom = (res) => {
    const raw = res.headers.get("set-cookie") || "";
    const m = raw.match(/swiftapp-session=([^;]*)/);
    return { value: m ? m[1] : null, raw };
  };

  const withCookie = (value) =>
    fetch(`${BASE}/api/projects`, {
      headers: { cookie: `swiftapp-session=${value}` },
      redirect: "manual",
    });

  const bad = await login("definitely-not-the-password");
  ok("wrong password -> 401", bad.status === 401, `got ${bad.status}`);

  const good = await login(PASSWORD);
  const c1 = cookieFrom(good);
  ok("correct password -> 200", good.status === 200, `got ${good.status}`);
  ok("cookie is a v2 signed token", (c1.value || "").startsWith("v2."), String(c1.value).slice(0, 12));
  ok("cookie is HttpOnly", /HttpOnly/i.test(c1.raw));
  ok("cookie is SameSite=Lax", /SameSite=Lax/i.test(c1.raw));

  const c2 = cookieFrom(await login(PASSWORD));
  ok("two logins mint DIFFERENT tokens", c1.value !== c2.value, "old scheme returned one fixed value");

  ok("valid session -> 200", (await withCookie(c1.value)).status === 200);
  ok("second session also valid", (await withCookie(c2.value)).status === 200);

  // The old static token: SHA256(password + "-swiftapp-session").
  const legacyBuf = await subtle.digest("SHA-256", enc.encode(PASSWORD + "-swiftapp-session"));
  const legacy = Array.from(new Uint8Array(legacyBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  ok("legacy static token REJECTED", (await withCookie(legacy)).status === 401, "the permanent key must be dead");

  // Flip the last character of the signature.
  const parts = c1.value.split(".");
  const lastChar = parts[2].slice(-1);
  const flipped = `${parts[0]}.${parts[1]}.${parts[2].slice(0, -1)}${lastChar === "A" ? "B" : "A"}`;
  ok("tampered signature rejected", (await withCookie(flipped)).status === 401);

  // Re-sign a payload whose expiry is in the past. Proves expiry is enforced,
  // not merely present in the payload.
  const b64url = (str) => Buffer.from(str, "utf8").toString("base64url");
  const keyMaterial = await subtle.digest("SHA-256", enc.encode(`${PASSWORD}|swiftapp-session-key|v2`));
  const key = await subtle.importKey("raw", keyMaterial, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);

  const stale = b64url(JSON.stringify({ v: 2, iat: now - 7200, exp: now - 60, n: "deadbeefdeadbeefdeadbeef" }));
  const staleSig = Buffer.from(await subtle.sign("HMAC", key, enc.encode(`v2.${stale}`))).toString("base64url");
  ok("correctly signed but EXPIRED token rejected", (await withCookie(`v2.${stale}.${staleSig}`)).status === 401);

  // Same construction, still in date -> accepted. Confirms the test above
  // failed on expiry rather than on a signature this script computed wrongly.
  const live = b64url(JSON.stringify({ v: 2, iat: now, exp: now + 600, n: "cafebabecafebabecafebabe" }));
  const liveSig = Buffer.from(await subtle.sign("HMAC", key, enc.encode(`v2.${live}`))).toString("base64url");
  ok("same construction, unexpired -> accepted", (await withCookie(`v2.${live}.${liveSig}`)).status === 200);

  ok("garbage cookie rejected", (await withCookie("not-a-token")).status === 401);
  ok("empty cookie rejected", (await withCookie("")).status === 401);

  const out = await fetch(`${BASE}/api/auth/logout`, { method: "POST", redirect: "manual" });
  ok("logout -> 200", out.status === 200, `got ${out.status}`);
  ok("logout clears the cookie", /swiftapp-session=(;|"")/.test(out.headers.get("set-cookie") || ""), out.headers.get("set-cookie") || "");
}

console.log("\n== 9. AGENT GUARDS (P1–P5) ==");
{
  // A browser session, to prove every guard below applies to the agent only and
  // does not quietly cripple the UI.
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: PASSWORD }),
    redirect: "manual",
  });
  const cookie = (loginRes.headers.get("set-cookie") || "").match(/swiftapp-session=([^;]*)/)?.[1];
  const asBrowser = (path, init = {}) =>
    fetch(BASE + path, {
      ...init,
      headers: { "Content-Type": "application/json", cookie: `swiftapp-session=${cookie}`, ...(init.headers || {}) },
      redirect: "manual",
    });

  const proj = (await api("/api/projects", {
    method: "POST",
    body: JSON.stringify({
      name: `AgentTest Guards ${Date.now()}`,
      clientName: "Ujian Guard Sdn Bhd",
      clientEmail: "rahsia@contoh.my",
      sowDetails: "Skop sulit yang agent tak patut baca",
      status: "Live",
    }),
  })).body;

  // ── P1: agent may only move status ────────────────────────────────────
  const m = (await api("/api/milestones", {
    method: "POST",
    body: JSON.stringify({ projectId: proj.id, name: "Guard milestone", amount: 1000 }),
  })).body;

  const amountAttack = await api(`/api/milestones/${m.id}`, {
    method: "PUT",
    body: JSON.stringify({ status: "In Progress", amount: 1 }),
  });
  ok("P1 agent rewriting milestone amount -> 403", amountAttack.status === 403, `got ${amountAttack.status}`);

  const statusOnly = await api(`/api/milestones/${m.id}`, {
    method: "PUT",
    body: JSON.stringify({ status: "In Progress" }),
  });
  ok("P1 agent status-only update -> 200", statusOnly.status === 200, `got ${statusOnly.status}`);

  const stillThousand = (await api(`/api/projects/${proj.id}`)).body.milestones.find((x) => x.id === m.id);
  ok("P1 amount untouched by the refused call", stillThousand.amount === 1000, `got ${stillThousand.amount}`);

  const projAttack = await api(`/api/projects/${proj.id}`, {
    method: "PUT",
    body: JSON.stringify({ status: "Live", clientName: "Dirampas Sdn Bhd" }),
  });
  ok("P1 agent rewriting project client -> 403", projAttack.status === 403, `got ${projAttack.status}`);

  const browserEdit = await asBrowser(`/api/milestones/${m.id}`, {
    method: "PUT",
    body: JSON.stringify({ status: "Completed", amount: 1500 }),
  });
  ok("P1 browser may still edit amount (guard is agent-only)", browserEdit.status === 200, `got ${browserEdit.status}`);

  // ── P4: redaction ─────────────────────────────────────────────────────
  const agentView = (await api(`/api/projects/${proj.id}`)).body;
  ok("P4 agent sees no client_email", agentView.client_email === undefined, JSON.stringify(agentView.client_email));
  ok("P4 agent sees no sow_details", agentView.sow_details === undefined);
  ok("P4 agent still sees client_name", agentView.client_name === "Ujian Guard Sdn Bhd", agentView.client_name);

  const browserView = await (await asBrowser(`/api/projects/${proj.id}`)).json();
  ok("P4 browser still sees client_email", browserView.client_email === "rahsia@contoh.my", browserView.client_email);
  ok("P4 browser still sees sow_details", typeof browserView.sow_details === "string");

  const listView = (await api("/api/projects?limit=5")).body;
  ok("P4 redaction applies to list responses too",
    (listView.data ?? listView.items ?? []).every((p) => p.client_email === undefined),
    JSON.stringify(Object.keys(listView)));

  const status = await api("/api/agent/status");
  ok("P4 /api/agent/status -> 200", status.status === 200, `got ${status.status}`);
  ok("P4 status carries counts", typeof status.body?.projects?.total === "number", JSON.stringify(status.body).slice(0, 120));
  ok("P4 status leaks no names or ids", !JSON.stringify(status.body).includes("Ujian Guard Sdn Bhd"));

  // ── P3: idempotency on creates ────────────────────────────────────────
  const pk = `proj-key-${Date.now()}`;
  const p1 = await api("/api/projects", {
    method: "POST", headers: { "X-Idempotency-Key": pk },
    body: JSON.stringify({ name: `AgentTest Idem ${Date.now()}` }),
  });
  const p2 = await api("/api/projects", {
    method: "POST", headers: { "X-Idempotency-Key": pk },
    body: JSON.stringify({ name: p1.body.name }),
  });
  ok("P3 repeated project create replays same id", p1.body.id === p2.body.id, `${p1.body.id} vs ${p2.body.id}`);

  const ik = `inv-key-${Date.now()}`;
  const i1 = await api("/api/invoices", {
    method: "POST", headers: { "X-Idempotency-Key": ik },
    body: JSON.stringify({ projectId: proj.id, type: "Deposit", amount: 777 }),
  });
  const i2 = await api("/api/invoices", {
    method: "POST", headers: { "X-Idempotency-Key": ik },
    body: JSON.stringify({ projectId: proj.id, type: "Deposit", amount: 777 }),
  });
  ok("P3 repeated invoice create replays same number",
    i1.body.invoice_number === i2.body.invoice_number, `${i1.body.invoice_number} vs ${i2.body.invoice_number}`);

  // ── P5: near-duplicate invoice guard ──────────────────────────────────
  const dup = await api("/api/invoices", {
    method: "POST",
    body: JSON.stringify({ projectId: proj.id, type: "Deposit", amount: 777 }),
  });
  ok("P5 identical invoice minutes later -> 409", dup.status === 409, `got ${dup.status}`);
  ok("P5 409 names the existing invoice", dup.body?.existingInvoiceNumber === i1.body.invoice_number, JSON.stringify(dup.body));

  const forced = await api("/api/invoices", {
    method: "POST",
    body: JSON.stringify({ projectId: proj.id, type: "Deposit", amount: 777, allowDuplicate: true }),
  });
  ok("P5 allowDuplicate lets a genuine second one through", forced.status === 201, `got ${forced.status}`);

  // ── P2: audit log ─────────────────────────────────────────────────────
  ok("P2 created_by recorded on the project", p1.body.created_by === "agent", p1.body.created_by);
  ok("P2 created_by recorded on the invoice", i1.body.created_by === "agent", i1.body.created_by);

  const pay = await api(`/api/invoices/${i1.body.id}/receipts`, {
    method: "POST",
    body: JSON.stringify({ amount: 777, paymentMethod: "transfer" }),
  });
  ok("P2 payment recorded", pay.status === 201, `got ${pay.status}`);

  const audit = (await api("/api/audit?limit=50")).body;
  ok("P2 /api/audit -> entries", Array.isArray(audit?.entries) && audit.entries.length > 0, JSON.stringify(audit).slice(0, 120));

  const actions = audit.entries.map((e) => `${e.entity}:${e.action}`);
  ok("P2 project create logged", actions.includes("project:create"), actions.slice(0, 8).join(","));
  ok("P2 invoice create logged", actions.includes("invoice:create"));
  ok("P2 payment logged", actions.includes("receipt:payment"));
  ok("P2 milestone status change logged", actions.includes("milestone:status") || actions.includes("milestone:update"));
  ok("P2 every entry names an actor", audit.entries.every((e) => e.actor === "agent" || e.actor === "browser"));

  const payEntry = audit.entries.find((e) => e.entity === "receipt" && e.action === "payment");
  ok("P2 payment entry carries before/after", !!payEntry?.before && !!payEntry?.after, JSON.stringify(payEntry ?? {}).slice(0, 150));
  ok("P2 payment entry attributed to the agent", payEntry?.actor === "agent", payEntry?.actor);

  const browserEntry = audit.entries.find((e) => e.actor === "browser");
  ok("P2 browser writes distinguished from agent writes", !!browserEntry, "the browser milestone edit above should appear");

  const filtered = (await api("/api/audit?limit=50&actor=agent")).body;
  ok("P2 audit filters by actor", filtered.entries.every((e) => e.actor === "agent"));
}

console.log("\n== 10. QUOTATION WRITE PATH ==");
{
  const stamp = Date.now();
  const client = `AgentTest Quote ${stamp}`;
  const items = [
    { description: "Setup sistem", quantity: 1, unitPrice: 3500 },
    { description: "Diskaun Rakan Portfolio", quantity: 1, unitPrice: -500 },
  ];

  const created = await api("/api/quotations", {
    method: "POST",
    body: JSON.stringify({ clientName: client, clientEmail: "sulit@contoh.my", items }),
  });
  ok("agent may now create a quotation", created.status === 201, `got ${created.status} ${JSON.stringify(created.body).slice(0, 120)}`);
  ok("total computed from the line items", created.body?.total_amount === 3000, `got ${created.body?.total_amount}`);
  ok("negative line item accepted (named discount)", Array.isArray(created.body?.items) && created.body.items.length === 2);
  ok("lands as Draft, never Sent", created.body?.status === "Draft", created.body?.status);
  ok("attributed to the agent", created.body?.created_by === "agent", created.body?.created_by);
  ok("client_email redacted from the agent's own copy", created.body?.client_email === undefined);

  // PUT is still shut: the agent drafts once, edits happen in the browser.
  const edit = await api(`/api/quotations/${created.body.id}`, {
    method: "PUT",
    body: JSON.stringify({ clientName: "Dirampas", items }),
  });
  ok("agent still cannot rewrite a quotation body", edit.status === 403, `got ${edit.status}`);

  // Duplicate guard, mirroring invoices.
  const dup = await api("/api/quotations", {
    method: "POST",
    body: JSON.stringify({ clientName: client, items }),
  });
  ok("identical draft minutes later -> 409", dup.status === 409, `got ${dup.status}`);
  ok("409 names the existing quotation", dup.body?.existingQuotationNumber === created.body.quotation_number, JSON.stringify(dup.body).slice(0, 140));

  const forced = await api("/api/quotations", {
    method: "POST",
    body: JSON.stringify({ clientName: client, items, allowDuplicate: true }),
  });
  ok("allowDuplicate lets a genuine second through", forced.status === 201, `got ${forced.status}`);

  // Idempotency: quotation numbers are sequential, a retry must not burn one.
  const qk = `quote-key-${stamp}`;
  const q1 = await api("/api/quotations", {
    method: "POST", headers: { "X-Idempotency-Key": qk },
    body: JSON.stringify({ clientName: `${client} B`, items }),
  });
  const q2 = await api("/api/quotations", {
    method: "POST", headers: { "X-Idempotency-Key": qk },
    body: JSON.stringify({ clientName: `${client} B`, items }),
  });
  ok("retry replays the same quotation number",
    q1.body?.quotation_number === q2.body?.quotation_number, `${q1.body?.quotation_number} vs ${q2.body?.quotation_number}`);

  // Status changes are no longer the agent's to make — covered in section 11.

  const auditQ = (await api("/api/audit?limit=50&entity=quotation")).body;
  ok("quotation create is audited", auditQ.entries.some((e) => e.action === "create"));

  // The global receipt list, newly opened and redacted.
  const receipts = await api("/api/receipts?limit=5");
  ok("GET /api/receipts now reachable", receipts.status === 200, `got ${receipts.status}`);
  ok("receipt list carries no client email", !JSON.stringify(receipts.body).includes("client_email"));
}

console.log("\n== 11. PDF, PROFILE, VALIDATION, WRITE CEILING ==");
{
  const tag = Date.now();
  const pdfClient = `Ujian PDF ${tag} Sdn Bhd`;
  const proj = (await api("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name: `AgentTest PDF ${tag}`, clientName: pdfClient }),
  })).body;

  // ── projectId validation ────────────────────────────────────────────
  const ghost = "11111111-2222-4333-8444-555555555555";
  const badQ = await api("/api/quotations", {
    method: "POST",
    body: JSON.stringify({
      clientName: "Hantu", projectId: ghost,
      items: [{ description: "x", quantity: 1, unitPrice: 100 }],
    }),
  });
  ok("quotation with unknown projectId -> 400 (was a 500 FK violation)", badQ.status === 400, `got ${badQ.status}`);
  ok("400 names the offending id", String(badQ.body?.error).includes(ghost), JSON.stringify(badQ.body));

  const badI = await api("/api/invoices", {
    method: "POST",
    body: JSON.stringify({ projectId: ghost, type: "Deposit", amount: 100 }),
  });
  ok("invoice with unknown projectId -> 400", badI.status === 400, `got ${badI.status}`);

  // ── quotation status is no longer the agent's to change ─────────────
  const q = (await api("/api/quotations", {
    method: "POST",
    body: JSON.stringify({
      clientName: pdfClient, projectId: proj.id,
      items: [
        { description: "Sistem Pengurusan — pembinaan penuh", quantity: 1, unitPrice: 9000 },
        { description: "Kadar Keluarga — pembinaan portfolio", quantity: 1, unitPrice: -9000 },
      ],
      validUntil: "2026-12-31",
    }),
  })).body;
  ok("quotation created with a named discount", q?.total_amount === 0, `got ${q?.total_amount} — ${JSON.stringify(q).slice(0, 140)}`);
  if (!q?.id) { console.log("  SKIP  remaining section 11 checks — no quotation to work with"); }

  if (q?.id) {
  const patch = await api(`/api/quotations/${q.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "Sent" }),
  });
  ok("agent can no longer mark a quotation Sent", patch.status === 403, `got ${patch.status}`);
  const stillDraft = (await api(`/api/quotations/${q.id}`)).body;
  ok("quotation stays Draft, still editable in the browser", stillDraft.status === "Draft", stillDraft.status);

  // ── PDF ─────────────────────────────────────────────────────────────
  const pdfRes = await fetch(`${BASE}/api/quotations/${q.id}/pdf`, {
    headers: { Authorization: `Bearer ${TOKEN}` }, redirect: "manual",
  });
  ok("PDF route -> 200", pdfRes.status === 200, `got ${pdfRes.status}`);
  ok("served as application/pdf", (pdfRes.headers.get("content-type") || "").includes("application/pdf"), pdfRes.headers.get("content-type"));

  const bytes = new Uint8Array(await pdfRes.arrayBuffer());
  const magic = String.fromCharCode(...bytes.slice(0, 4));
  ok("body is a real PDF (%PDF magic)", magic === "%PDF", magic);
  ok("PDF is not a stub", bytes.length > 3000, `${bytes.length} bytes`);
  ok("filename carries the document number",
    (pdfRes.headers.get("content-disposition") || "").includes(q.quotation_number.replace(/[^\w.-]/g, "_")),
    pdfRes.headers.get("content-disposition"));

  const missing = await fetch(`${BASE}/api/quotations/11111111-2222-4333-8444-555555555555/pdf`, {
    headers: { Authorization: `Bearer ${TOKEN}` }, redirect: "manual",
  });
  ok("PDF for a missing quotation -> 404", missing.status === 404, `got ${missing.status}`);

  // ── business profile ────────────────────────────────────────────────
  const prof = await api("/api/agent/business-profile");
  ok("business profile reachable", prof.status === 200 || prof.status === 404, `got ${prof.status}`);
  if (prof.status === 200) {
    const raw = JSON.stringify(prof.body);
    ok("profile carries the company name", typeof prof.body?.companyName === "string");
    ok("profile withholds bank name", !("bankName" in prof.body), raw.slice(0, 120));
    ok("profile withholds account number", !raw.includes("bankAccount"));
    ok("profile withholds SWIFT", !raw.includes("bankSwift"));
  }
  }

  const settings = await api("/api/settings");
  ok("full settings still refused", settings.status === 403, `got ${settings.status}`);
}

console.log("\n== 8. LOGIN RATE LIMIT ==");
{
  // This section burns the login budget for this address, so it runs last and
  // clears the counter directly afterwards. Skipped when the database is not
  // reachable from here (e.g. testing a remote deployment).
  let db = null;
  try {
    const { Client } = await import("pg");
    const conn = process.env.DATABASE_URL;
    if (!conn) throw new Error("DATABASE_URL not set");
    db = new Client({ connectionString: conn });
    await db.connect();
    await db.query("delete from login_attempts");
  } catch (e) {
    db = null;
    console.log(`  SKIP  rate limit tests — no database access (${e.message})`);
  }

  if (db) {
    const login = (pw) =>
      fetch(`${BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
        redirect: "manual",
      });

    const max = Number(process.env.LOGIN_MAX_FAILURES || 10);

    let lastBody = null;
    let statuses = [];
    for (let i = 0; i < max; i++) {
      const r = await login(`wrong-guess-${i}`);
      statuses.push(r.status);
      lastBody = await r.json().catch(() => null);
    }
    ok(`${max} wrong passwords all answer 401`, statuses.every((s) => s === 401), statuses.join(","));
    ok("counter surfaced only near the end", lastBody?.attemptsRemaining === 0, JSON.stringify(lastBody));

    const blocked = await login("wrong-again");
    ok("next attempt -> 429", blocked.status === 429, `got ${blocked.status}`);
    const retryAfter = blocked.headers.get("retry-after");
    ok("429 carries Retry-After", retryAfter !== null && Number(retryAfter) > 0, String(retryAfter));

    // The gate runs before the password check, so even the right password is
    // refused while locked. If it were not, an attacker mid-sweep would walk
    // straight through the lock the moment they guessed correctly.
    const rightButLocked = await login(PASSWORD);
    ok("CORRECT password also refused while locked", rightButLocked.status === 429, `got ${rightButLocked.status}`);

    await db.query("delete from login_attempts");
    const afterReset = await login(PASSWORD);
    ok("login works again once the window clears", afterReset.status === 200, `got ${afterReset.status}`);

    // A success wipes the bucket, so a few typos before the real password cost
    // nothing later.
    await login("typo-one");
    await login("typo-two");
    await login(PASSWORD);
    const { rows } = await db.query("select count(*)::int n from login_attempts");
    ok("successful login clears earlier failures", rows[0].n === 0, `rows=${rows[0].n}`);

    await db.query("delete from login_attempts");
    await db.end();
  }
}

console.log(`\n==== ${pass} passed, ${fail} failed ====`);
process.exit(fail ? 1 : 0);
