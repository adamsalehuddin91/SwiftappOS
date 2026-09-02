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
