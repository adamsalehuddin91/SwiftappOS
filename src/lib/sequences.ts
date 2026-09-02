import prisma from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Any client that can run queries — the global one, or an interactive
 * transaction. Callers that already hold a transaction MUST pass it: opening a
 * nested `prisma.$transaction` grabs a second connection and can deadlock
 * against the row locks the outer transaction is holding.
 */
export type DbClient = Prisma.TransactionClient | typeof prisma;

async function nextValue(
  client: DbClient,
  type: "invoice" | "quotation" | "receipt"
): Promise<number> {
  const seq = await client.sequence.upsert({
    where: { id: type },
    update: { lastValue: { increment: 1 } },
    create: { id: type, prefix: type, lastValue: 1 },
  });
  return seq.lastValue;
}

export async function getNextNumber(
  type: "invoice" | "quotation" | "receipt",
  tx?: Prisma.TransactionClient
): Promise<string> {
  const year = new Date().getFullYear();

  const value = tx
    ? await nextValue(tx, type)
    : await prisma.$transaction((client) => nextValue(client, type));

  const padded = String(value).padStart(4, "0");

  switch (type) {
    case "invoice":
      return `INV-${year}-${padded}`;
    case "quotation":
      return `SWIFT/QT/${year}/${padded}`;
    case "receipt":
      return `RCP-${year}-${padded}`;
  }
}
