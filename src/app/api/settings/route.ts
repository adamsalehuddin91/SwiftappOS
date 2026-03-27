import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { updateSettingsSchema } from "@/lib/validations";

export async function GET() {
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) {
      return NextResponse.json({
        companyName: "",
        address: "",
        contactNo: "",
        email: "",
        website: "",
        brn: "",
        sstNumber: "",
        enableSst: false,
        bankName: "",
        bankAccount: "",
        bankSwift: "",
        logoUrl: "",
      });
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const data = parsed.data;

    const settings = await prisma.businessSettings.upsert({
      where: { id: "default" },
      update: {
        companyName: data.companyName,
        address: data.address,
        contactNo: data.contactNo,
        email: data.email,
        website: data.website || null,
        brn: data.brn || null,
        sstNumber: data.sstNumber || null,
        enableSst: data.enableSst,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        bankSwift: data.bankSwift || null,
        logoUrl: data.logoUrl || null,
      },
      create: {
        id: "default",
        companyName: data.companyName,
        address: data.address,
        contactNo: data.contactNo,
        email: data.email,
        website: data.website || null,
        brn: data.brn || null,
        sstNumber: data.sstNumber || null,
        enableSst: data.enableSst,
        bankName: data.bankName || null,
        bankAccount: data.bankAccount || null,
        bankSwift: data.bankSwift || null,
        logoUrl: data.logoUrl || null,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
