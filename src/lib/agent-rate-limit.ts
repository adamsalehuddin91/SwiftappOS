import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { isAgentCaller } from "@/lib/agent-guard";

/**
 * A ceiling on how fast the agent can create documents.
 *
 * The login gate is rate limited; the agent API was not. A cron that misfires,
 * a retry loop with a fresh key each pass, or a leaked token could call create
 * endpoints as fast as the network allows. Each call burns a sequential
 * document number permanently, so the damage is not undone by deleting the
 * rows afterwards — the gaps stay.
 *
 * Deliberately scoped to creates. Status changes are near-idempotent and a loop
 * of them leaves nothing behind worth cleaning up; adding a check to every
 * route would spread the cost without buying anything.
 *
 * The counter reads `audit_log`, which already records every agent write, so
 * this needs no table of its own. Idempotent replays write no audit row and so
 * do not count — a genuine retry is not punished for the network's failure.
 */

export const AGENT_WRITES_PER_MINUTE = Number(
  process.env.AGENT_WRITES_PER_MINUTE ?? 60
);

const WINDOW_MS = 60 * 1000;

/**
 * Returns a response to send back, or null to continue.
 * Browser callers are never limited here — they have the login gate.
 */
export async function checkAgentWriteLimit(
  request: Request
): Promise<NextResponse | null> {
  if (!isAgentCaller(request)) return null;

  const since = new Date(Date.now() - WINDOW_MS);

  const recent = await prisma.auditLog.findMany({
    where: {
      actor: "agent",
      action: { in: ["create", "payment"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true },
  });

  if (recent.length < AGENT_WRITES_PER_MINUTE) return null;

  const oldest = recent[0].createdAt.getTime();
  const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - Date.now()) / 1000));

  return NextResponse.json(
    {
      error: `Agent write limit reached (${AGENT_WRITES_PER_MINUTE} per minute). Retry in ${retryAfter}s.`,
      hint: "This ceiling exists so a runaway loop cannot burn document numbers.",
    },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
