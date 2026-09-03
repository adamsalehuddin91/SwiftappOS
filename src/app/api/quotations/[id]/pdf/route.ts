import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import type { DocumentProps } from "@react-pdf/renderer";
import { createElement } from "react";
import type { ReactElement } from "react";
import prisma from "@/lib/prisma";
import { PdfDocument } from "@/lib/pdf-generator";
import { loadCompanyDetails } from "@/lib/pdf-render";
import type { QuotationItem } from "@/types";

/**
 * GET /api/quotations/[id]/pdf
 *
 * Renders the same `PdfDocument` template the browser uses, with the same
 * stored business profile and the document's own number. Read-only: nothing
 * here writes, and the quotation is rendered exactly as it stands.
 */

const UUID_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const quotation = await prisma.quotation.findUnique({ where: { id } });
    if (!quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    const companyDetails = await loadCompanyDetails();

    // Same shape the quotation page passes to PdfDocument, so the two cannot
    // drift into rendering different documents from the same record.
    const data = {
      number: quotation.quotationNumber,
      clientName: quotation.clientName,
      clientEmail: quotation.clientEmail ?? "",
      clientPhone: quotation.clientPhone ?? "",
      clientBrn: quotation.clientBrn ?? "",
      items: (quotation.items as unknown) as QuotationItem[],
      total: Number(quotation.totalAmount),
      notes: quotation.notes ?? "",
      validUntil: quotation.validUntil
        ? quotation.validUntil.toISOString().split("T")[0]
        : "",
    };

    // PdfDocument is typed by its own props rather than by DocumentProps, so
    // the element needs re-typing for renderToBuffer. It does return a
    // <Document> at runtime — the cast narrows the declaration, not the value.
    const element = createElement(PdfDocument, {
      type: "Quotation",
      data,
      companyDetails,
    }) as unknown as ReactElement<DocumentProps>;

    const buffer = await renderToBuffer(element);

    // `inline` so a browser preview works; the filename still carries the
    // document number for anything that saves it.
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="Quotation_${quotation.quotationNumber.replace(
          /[^\w.-]/g,
          "_"
        )}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to render PDF" },
      { status: 500 }
    );
  }
}
