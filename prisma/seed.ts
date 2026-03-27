import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.receipt.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.project.deleteMany();
  await prisma.sequence.deleteMany();

  // Seed sequences (counters for invoice/quotation/receipt numbers)
  await prisma.sequence.createMany({
    data: [
      { id: "invoice", prefix: "INV", lastValue: 1 },
      { id: "quotation", prefix: "SWIFT/QT", lastValue: 1 },
      { id: "receipt", prefix: "RCP", lastValue: 1 },
    ],
  });

  // Create projects
  const ecommerce = await prisma.project.create({
    data: {
      name: "E-Commerce Revamp",
      description: "Complete overhaul of the shopping cart.",
      status: "Dev",
      sowDetails:
        "Complete overhaul of the shopping cart including Stripe integration and responsive design.",
      clientName: "TechCorp Sdn Bhd",
      clientEmail: "billing@techcorp.my",
    },
  });

  const hrPortal = await prisma.project.create({
    data: {
      name: "Internal HR Portal",
      description: "Employee onboarding module.",
      status: "UAT",
      sowDetails: "Employee onboarding module with leave management and payroll integration.",
      clientName: "MegaHR Solutions",
      clientEmail: "admin@megahr.my",
    },
  });

  const landingPage = await prisma.project.create({
    data: {
      name: "Marketing Landing Page",
      description: "Campaign for Q4 sales.",
      status: "Live",
      sowDetails: "High-conversion landing page for Q4 promotional campaign.",
      clientName: "MarketBuzz Agency",
      clientEmail: "projects@marketbuzz.my",
    },
  });

  // Create milestones for E-Commerce
  const m1 = await prisma.milestone.create({
    data: {
      projectId: ecommerce.id,
      name: "UI/UX Design",
      description: "Complete design mockups and prototypes",
      status: "Completed",
      amount: 2000,
      dueDate: new Date("2026-01-15"),
    },
  });

  const m2 = await prisma.milestone.create({
    data: {
      projectId: ecommerce.id,
      name: "Backend API",
      description: "REST API development with authentication",
      status: "InProgress",
      amount: 3500,
      dueDate: new Date("2026-02-28"),
    },
  });

  await prisma.milestone.create({
    data: {
      projectId: ecommerce.id,
      name: "Frontend Integration",
      description: "Connect frontend to API, payment gateway",
      status: "Pending",
      amount: 3500,
      dueDate: new Date("2026-03-30"),
    },
  });

  // Milestones for HR Portal
  await prisma.milestone.create({
    data: {
      projectId: hrPortal.id,
      name: "Deposit Payment",
      status: "Paid",
      amount: 5000,
    },
  });

  await prisma.milestone.create({
    data: {
      projectId: hrPortal.id,
      name: "Core Module Development",
      status: "Completed",
      amount: 5000,
      dueDate: new Date("2026-02-01"),
    },
  });

  // Milestones for Landing Page
  await prisma.milestone.create({
    data: {
      projectId: landingPage.id,
      name: "Full Delivery",
      status: "Paid",
      amount: 3000,
    },
  });

  // Create an invoice
  const invoice = await prisma.invoice.create({
    data: {
      projectId: ecommerce.id,
      milestoneId: m1.id,
      invoiceNumber: "INV-2026-0001",
      type: "Deposit",
      amount: 2000,
      status: "Paid",
      dueDate: new Date("2026-01-20"),
      items: [
        {
          description: "UI/UX Design - Deposit",
          quantity: 1,
          unitPrice: 2000,
        },
      ],
    },
  });

  // Create a receipt for the paid invoice
  await prisma.receipt.create({
    data: {
      invoiceId: invoice.id,
      receiptNumber: "RCP-2026-0001",
      amountPaid: 2000,
      paymentMethod: "Bank Transfer",
      paymentDate: new Date("2026-01-22"),
    },
  });

  // Create a quotation
  await prisma.quotation.create({
    data: {
      projectId: hrPortal.id,
      quotationNumber: "SWIFT/QT/2026/0001",
      clientName: "MegaHR Solutions",
      clientEmail: "admin@megahr.my",
      items: [
        { description: "Backend Development", quantity: 1, unitPrice: 5000 },
        { description: "Frontend Development", quantity: 1, unitPrice: 3000 },
        { description: "QA & Testing", quantity: 1, unitPrice: 2000 },
      ],
      totalAmount: 10000,
      status: "Accepted",
      validUntil: new Date("2026-03-01"),
      notes:
        "1. 50% Deposit required to commence work.\n2. Balance 50% upon completion.\n3. Quotation valid for 14 days.",
    },
  });

  console.log("Seed completed successfully!");
  console.log(`  Projects: 3`);
  console.log(`  Milestones: 6`);
  console.log(`  Invoices: 1`);
  console.log(`  Receipts: 1`);
  console.log(`  Quotations: 1`);
  console.log(`  Sequences: 3`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
