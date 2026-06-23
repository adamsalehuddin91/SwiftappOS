
import type { Metadata } from "next";
import { Figtree, Fraunces } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";
import { Toaster } from "sonner";

// Dark-Luxe typography — Figtree (UI/body) + Fraunces (display/serif headings)
const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });

export const metadata: Metadata = {
  title: "SwiftApp OS",
  description: "Internal Management for Senior Developers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} ${fraunces.variable}`}>
      <body className="font-sans antialiased">
        <div className="flex min-h-screen w-full">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {/* Mobile Sidebar */}
          <MobileSidebar />

          <main className="flex-1 p-6 md:p-10 w-full">
            {children}
          </main>
        </div>
        <Toaster richColors theme="dark" position="top-right" />
      </body>
    </html>
  );
}
