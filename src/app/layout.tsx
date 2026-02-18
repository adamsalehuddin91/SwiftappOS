
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { MobileSidebar } from "@/components/MobileSidebar";

const inter = Inter({ subsets: ["latin"] });

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
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen w-full">
          {/* Desktop Sidebar */}
          <div className="hidden md:block">
            <Sidebar />
          </div>

          {/* Mobile Sidebar */}
          <MobileSidebar />

          <main className="flex-1 p-6 md:p-10 bg-white w-full">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
