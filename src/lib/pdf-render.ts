import { readFile } from "node:fs/promises";
import path from "node:path";
import prisma from "@/lib/prisma";

/**
 * Server-side document rendering.
 *
 * Until now the PDF only existed in the browser: `PDFDownloadLink` built it in
 * the page, so nothing outside a logged-in tab could produce one. This makes the
 * same template renderable from a route handler, using the same component and
 * the same stored business profile — one template, not two that drift.
 */

export interface CompanyDetails {
  companyName: string;
  address: string;
  contactNo: string;
  email: string;
  website?: string | null;
  brn?: string | null;
  sstNumber?: string | null;
  enableSst?: boolean;
  bankName?: string | null;
  bankAccount?: string | null;
  bankSwift?: string | null;
  logoUrl?: string | null;
}

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

/**
 * Turn the stored logo path into something the renderer can actually load.
 *
 * The browser resolves `/uploads/logo.png` against window.location. A route
 * handler has no window, and fetching the same path over HTTP would fail
 * anyway: the middleware matcher covers /uploads, so the app's own request
 * would arrive with no session and be refused. Reading from disk avoids both
 * problems, and a data URI needs no second request at render time.
 *
 * A missing or unreadable file is not an error — the template already handles
 * a null logo by printing the company name instead. A document that renders
 * without its logo beats a 500.
 */
async function inlineLogo(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;

  // Already inlined, or hosted somewhere the renderer can fetch on its own.
  if (logoUrl.startsWith("data:") || /^https?:\/\//i.test(logoUrl)) return logoUrl;
  if (!logoUrl.startsWith("/")) return null;

  // Confine reads to public/ — the path comes from a settings row, and a stored
  // "/../../etc/passwd" must not become a file read.
  const publicDir = path.join(process.cwd(), "public");
  const resolved = path.resolve(publicDir, "." + logoUrl);
  if (!resolved.startsWith(publicDir + path.sep)) return null;

  const mime = MIME_BY_EXT[path.extname(resolved).toLowerCase()];
  if (!mime) return null;

  try {
    const bytes = await readFile(resolved);
    return `data:${mime};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

/** The stored business profile, with the logo made renderable. */
export async function loadCompanyDetails(): Promise<CompanyDetails | undefined> {
  const settings = await prisma.businessSettings.findUnique({ where: { id: "default" } });
  if (!settings) return undefined;

  return {
    companyName: settings.companyName,
    address: settings.address,
    contactNo: settings.contactNo,
    email: settings.email,
    website: settings.website,
    brn: settings.brn,
    sstNumber: settings.sstNumber,
    enableSst: settings.enableSst,
    bankName: settings.bankName,
    bankAccount: settings.bankAccount,
    bankSwift: settings.bankSwift,
    logoUrl: await inlineLogo(settings.logoUrl),
  };
}

/**
 * Only the fields a caller needs to preview or render a document header.
 *
 * Bank name, account number and SWIFT are deliberately absent: they are the one
 * part of the profile worth stealing, and nothing outside the document itself
 * needs to read them.
 */
export function sanitizeCompanyDetails(details: CompanyDetails | undefined) {
  if (!details) return null;
  return {
    companyName: details.companyName,
    address: details.address,
    contactNo: details.contactNo,
    email: details.email,
    website: details.website ?? null,
    brn: details.brn ?? null,
    sstNumber: details.sstNumber ?? null,
    enableSst: details.enableSst ?? false,
    hasLogo: Boolean(details.logoUrl),
  };
}
