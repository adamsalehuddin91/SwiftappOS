
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderKanban, Receipt, PieChart, Wallet } from "lucide-react";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "SwiftBilling", href: "/billing", icon: Receipt },
    { name: "Cashflow", href: "/analytics", icon: PieChart },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();

    return (
        <div className={cn("flex h-screen w-64 flex-col border-r bg-gray-50/40", className)}>
            <div className="flex h-14 items-center border-b px-6">
                <span className="text-lg font-bold text-slate-800">SwiftApp OS</span>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
                <nav className="grid items-start px-4 text-sm font-medium">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-slate-900",
                                    isActive
                                        ? "bg-slate-100 text-slate-900"
                                        : "text-slate-500 hover:bg-slate-100"
                                )}
                            >
                                <Icon className="h-4 w-4" />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
            </div>
            <div className="mt-auto border-t p-4">
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-200"></div>
                    <div className="text-xs">
                        <p className="font-medium">Senior Dev</p>
                        <p className="text-slate-500">admin@swiftapp.com</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
