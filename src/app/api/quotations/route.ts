import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { mapQuotation } from "@/lib/mappers";
import { createQuotationSchema, paginationSchema } from "@/lib/validations";
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
          { quotationNumber: { contains: params.search, mode: "insensitive" as const } },
          { clientName: { contains: params.search, mode: "insensitive" as const } },
        ],
      }),
      ...(params.status && { status: params.status as never }),
    };

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        ...getPaginationParams(params.page, params.limit),
      }),
      prisma.quotation.count({ where }),
    ]);

    return NextResponse.json(
      sanitizeForCaller(
        request,
        buildPaginatedResponse(quotations.map(mapQuotation), total, params.page, params.limit)
      )
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch quotations" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createQuotationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const limited = await checkAgentWriteLimit(request);
    if (limited) return limited;

    const data = parsed.data;

    // A projectId that does not exist used to reach Postgres and come back as a
    // foreign-key violation — a 500 that tells the caller nothing about what it
    // got wrong.
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

    const totalAmount = data.items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );

    return await withIdempotency(
      idempotencyKeyFrom(request),
      "POST /api/quotations",
      parsed.data,
      async () => {
        // Same reasoning as invoices: quotation numbers are sequential and
        // permanent, so a retry or a double click burns one and leaves a
        // duplicate document in front of the client.
        if (!data.allowDuplicate) {
          const recent = await prisma.quotation.findFirst({
            where: {
              clientName: data.clientName,
              totalAmount,
              status: "Draft",
              createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
            },
            orderBy: { createdAt: "desc" },
          });

          if (recent) {
            return {
              status: 409,
              body: {
                error: `An identical draft quotation (${recent.quotationNumber}) was created ${Math.round(
                  (Date.now() - recent.createdAt.getTime()) / 1000
                )}s ago.`,
                existingQuotationId: recent.id,
                existingQuotationNumber: recent.quotationNumber,
                hint: 'Send { "allowDuplicate": true } if a second one is genuinely intended.',
              },
            };
          }
        }

        const quotation = await prisma.$transaction(async (tx) => {
          const quotationNumber = await getNextNumber("quotation", tx);

          return tx.quotation.create({
            data: {
              quotationNumber,
              projectId: data.projectId ?? null,
              clientName: data.clientName,
              clientEmail: data.clientEmail || null,
              clientBrn: data.clientBrn ?? null,
              clientPhone: data.clientPhone ?? null,
              items: data.items,
              totalAmount,
              notes: data.notes ?? null,
              validUntil: data.validUntil ? new Date(data.validUntil) : null,
              // Always Draft: createQuotationSchema has no `status` field, so a
              // caller cannot mint one already marked Sent. Moving it on takes a
              // separate, deliberate PATCH.
              createdBy: callerLabel(request),
            },
          });
        });

        await recordAudit({
          request,
          entity: "quotation",
          entityId: quotation.id,
          action: "create",
          after: mapQuotation(quotation),
        });

        return { status: 201, body: sanitizeForCaller(request, mapQuotation(quotation)) };
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create quotation" },
      { status: 500 }
    );
  }
}
