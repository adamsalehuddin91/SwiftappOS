import prisma from "@/lib/prisma";

export async function getNextNumber(type: "invoice" | "quotation" | "receipt"): Promise<string> {
  const year = new Date().getFullYear();

  const result = await prisma.$transaction(async (tx) => {
    const seq = await tx.sequence.upsert({
      where: { id: type },
      update: { lastValue: { increment: 1 } },
      create: { id: type, prefix: type, lastValue: 1 },
    });
    return seq.lastValue;
  });

  const padded = String(result).padStart(4, "0");

  switch (type) {
    case "invoice":
      return `INV-${year}-${padded}`;
    case "quotation":
      return `SWIFT/QT/${year}/${padded}`;
    case "receipt":
      return `RCP-${year}-${padded}`;
  }
}
