import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getNextNumber } from "@/lib/sequences";
import { idempotencyKeyFrom, withIdempotency } from "@/lib/idempotency";
import { callerLabel, sanitizeForCaller } from "@/lib/agent-guard";
import { recordAudit } from "@/lib/audit";
import { checkAgentWriteLimit } from "@/lib/agent-rate-limit";
import { z } from "zod";

const recordPaymentSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentMethod: z.string().max(100).optional().nullable(),
  paymentDate: z.string().optional(),
});

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }
    const receipts = await prisma.receipt.findMany({
      where: { invoiceId: id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sanitizeForCaller(_request, receipts));
  } catch {
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: invoiceId } = await params;

    if (!UUID_RE.test(invoiceId)) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const body = await request.json();
    const parsed = recordPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const limited = await checkAgentWriteLimit(request);
    if (limited) return limited;

    const { amount, paymentMethod, paymentDate } = parsed.data;

    return await withIdempotency(
      idempotencyKeyFrom(request),
      `POST /api/invoices/${invoiceId}/receipts`,
      parsed.data,
      async () => {
        const result = await prisma.$transaction(
          async (tx) => {
            // Serialise concurrent payments against this invoice.
            //
            // Reading the paid-to-date total and inserting the receipt used to be
            // separate statements with no lock between them, so two calls landing
            // together both saw the old total, both passed the balance check, and
            // both inserted — one payment, two receipts, and a cashflow figure
            // (which sums receipts) that was double. A retrying agent makes that
            // overlap likely rather than theoretical.
            const locked = await tx.$queryRaw<{ id: string }[]>`
              SELECT "id" FROM "invoices" WHERE "id" = ${invoiceId}::uuid FOR UPDATE
            `;
            if (locked.length === 0) {
              return { status: 404 as const, body: { error: "Invoice not found" } };
            }

            const invoice = await tx.invoice.findUniqueOrThrow({
              where: { id: invoiceId },
              include: { receipts: true },
            });

            if (invoice.status === "Paid") {
              return {
                status: 400 as const,
                body: { error: "Invoice is already fully paid" },
              };
            }
            if (invoice.status === "Void") {
              return {
                status: 400 as const,
                body: { error: "Cannot pay a void invoice" },
              };
            }

            const totalAlreadyPaid = invoice.receipts.reduce(
              (sum, r) => sum + Number(r.amountPaid),
              0
            );
            const remaining = Number(invoice.amount) - totalAlreadyPaid;

            if (amount > remaining + 0.01) {
              return {
                status: 400 as const,
                body: {
                  error: `Amount exceeds remaining balance of RM ${remaining.toFixed(2)}`,
                },
              };
            }

            const receiptNumber = await getNextNumber("receipt", tx);

            const receipt = await tx.receipt.create({
              data: {
                receiptNumber,
                invoiceId,
                amountPaid: amount,
                paymentMethod: paymentMethod ?? null,
                paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
                createdBy: callerLabel(request),
              },
            });

            const totalPaid = totalAlreadyPaid + amount;
            const fullySettled = totalPaid >= Number(invoice.amount) - 0.01;

            let milestonesMarkedPaid = 0;
            let unlinkedInvoicedMilestones = 0;
            let status: string = invoice.status;

            if (fullySettled) {
              await tx.invoice.update({
                where: { id: invoiceId },
                data: { status: "Paid" },
              });
              status = "Paid";

              // Mark exactly the milestones this invoice billed.
              //
              // This used to be updateMany({ projectId, status: "Invoiced" }),
              // which marked every Invoiced milestone on the project — including
              // milestones billed on a different invoice that was still unpaid.
              // Paying a deposit flipped the whole project to Paid.
              const marked = await tx.milestone.updateMany({
                where: { invoicedById: invoiceId, status: "Invoiced" },
                data: { status: "Paid" },
              });
              milestonesMarkedPaid = marked.count;

              // Milestones raised before invoices recorded their billing link
              // cannot be attributed. Report them instead of guessing.
              if (invoice.projectId) {
                unlinkedInvoicedMilestones = await tx.milestone.count({
                  where: {
                    projectId: invoice.projectId,
                    status: "Invoiced",
                    invoicedById: null,
                  },
                });
              }
            }

            // Logged inside the same transaction as the payment: an audit row
            // that can go missing while the money lands is the one case where
            // best-effort logging is not good enough.
            await recordAudit({
              request,
              tx,
              entity: "receipt",
              entityId: receipt.id,
              action: "payment",
              before: {
                invoiceNumber: invoice.invoiceNumber,
                status: invoice.status,
                totalPaid: totalAlreadyPaid,
              },
              after: {
                invoiceNumber: invoice.invoiceNumber,
                status,
                totalPaid,
                receiptNumber: receipt.receiptNumber,
                amountPaid: amount,
                milestonesMarkedPaid,
              },
            });

            return {
              status: 201 as const,
              body: {
                receipt: {
                  id: receipt.id,
                  receiptNumber: receipt.receiptNumber,
                  invoiceId: receipt.invoiceId,
                  amountPaid: Number(receipt.amountPaid),
                  paymentMethod: receipt.paymentMethod,
                  paymentDate: receipt.paymentDate.toISOString().split("T")[0],
                },
                invoice: {
                  id: invoice.id,
                  invoiceNumber: invoice.invoiceNumber,
                  status,
                  amount: Number(invoice.amount),
                  totalPaid,
                  remaining: Number(invoice.amount) - totalPaid,
                },
                milestonesMarkedPaid,
                unlinkedInvoicedMilestones,
              },
            };
          },
          { timeout: 15000 }
        );

        return result;
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record payment" },
      { status: 500 }
    );
  }
}
