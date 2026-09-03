import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapInvoice } from "@/lib/mappers";
import { createInvoiceSchema, paginationSchema } from "@/lib/validations";
import { getNextNumber } from "@/lib/sequences";
import { getPaginationParams, buildPaginatedResponse } from "@/lib/pagination";
import { callerLabel, sanitizeForCaller } from "@/lib/agent-guard";
import { recordAudit } from "@/lib/audit";
import { idempotencyKeyFrom, withIdempotency } from "@/lib/idempotency";
import { checkAgentWriteLimit } from "@/lib/agent-rate-limit";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const params = paginationSchema.parse({
      page: url.searchParams.get("page") ?? 1,
      limit: url.searchParams.get("limit") ?? 20,
      search: url.searchParams.get("search") ?? "",
      status: url.searchParams.get("status") ?? "",
    });

    const where = {
      ...(params.search && {
        OR: [
          { invoiceNumber: { contains: params.search, mode: "insensitive" as const } },
          { project: { name: { contains: params.search, mode: "insensitive" as const } } },
        ],
      }),
      ...(params.status && { status: params.status as never }),
    };

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { project: true },
        ...getPaginationParams(params.page, params.limit),
      }),
      prisma.invoice.count({ where }),
    ]);

    return NextResponse.json(
      sanitizeForCaller(
        request,
        buildPaginatedResponse(invoices.map(mapInvoice), total, params.page, params.limit)
      )
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createInvoiceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const limited = await checkAgentWriteLimit(request);
    if (limited) return limited;

    const data = parsed.data;

    if (data.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: data.projectId },
        select: { id: true },
      });
      if (!project) {
        return NextResponse.json(
          { error: `Project ${data.projectId} does not exist.` },
          { status: 400 }
        );
      }
    }

    // Single milestone link: explicit milestoneId, else the sole milestoneIds entry.
    const linkMilestoneId =
      data.milestoneId ?? (data.milestoneIds?.length === 1 ? data.milestoneIds[0] : null);

    return await withIdempotency(
      idempotencyKeyFrom(request),
      "POST /api/invoices",
      parsed.data,
      async () => {
        // Runs INSIDE the idempotency wrapper, not before it. A keyed retry is
        // the one duplicate that is legitimate — checking for near-duplicates
        // first would answer 409 to the very case the key exists to make safe.
        //
        // A second invoice for the same project, type and amount minutes after the
        // first is almost always a retry or a double click, not a real document.
        // Invoice numbers are sequential and permanent, so a duplicate burns one and
        // leaves a phantom debt on the client's account.
        if (!data.allowDuplicate) {
          const recent = await prisma.invoice.findFirst({
            where: {
              projectId: data.projectId ?? null,
              type: data.type,
              amount: data.amount,
              status: { not: "Void" },
              createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
            },
            orderBy: { createdAt: "desc" },
          });

          if (recent) {
            return {
              status: 409,
              body: {
                error: `An identical invoice (${recent.invoiceNumber}) was raised ${Math.round(
                  (Date.now() - recent.createdAt.getTime()) / 1000
                )}s ago.`,
                existingInvoiceId: recent.id,
                existingInvoiceNumber: recent.invoiceNumber,
                hint: 'Send { "allowDuplicate": true } if a second one is genuinely intended.',
              },
            };
          }
        }

    // One transaction: an invoice must never exist with its milestones left
    // unmarked, and the invoice number must not be burned if the sync fails.
    const invoice = await prisma.$transaction(async (tx) => {
      const invoiceNumber = await getNextNumber("invoice", tx);

      const created = await tx.invoice.create({
        data: {
          invoiceNumber,
          projectId: data.projectId,
          milestoneId: linkMilestoneId,
          type: data.type,
          amount: data.amount,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          items: data.items ?? [],
          clientName: data.clientName ?? null,
          clientEmail: data.clientEmail || null,
          clientBrn: data.clientBrn ?? null,
          notes: data.notes ?? null,
          createdBy: callerLabel(request),
        },
        include: { project: true },
      });

      // Auto-sync milestones → Invoiced, and record WHICH invoice billed them.
      // The back-link is what lets payment later mark exactly these milestones
      // Paid instead of every Invoiced milestone on the project.
      if (data.milestoneIds && data.milestoneIds.length > 0) {
        await tx.milestone.updateMany({
          where: { id: { in: data.milestoneIds }, status: "Completed" },
          data: { status: "Invoiced", invoicedById: created.id },
        });
      } else if (data.projectId) {
        await tx.milestone.updateMany({
          where: { projectId: data.projectId, status: "Completed" },
          data: { status: "Invoiced", invoicedById: created.id },
        });
      }

      return created;
    });

        await recordAudit({
          request,
          entity: "invoice",
          entityId: invoice.id,
          action: "create",
          after: mapInvoice(invoice),
        });

        return { status: 201, body: sanitizeForCaller(request, mapInvoice(invoice)) };
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create invoice" },
      { status: 500 }
    );
  }
}
