
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderKanban, Receipt, PieChart, Zap, Settings } from "lucide-react";

const navigation = [
    { name: "Overview", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderKanban },
    { name: "Billing", href: "/billing", icon: Receipt },
    { name: "Cashflow", href: "/analytics", icon: PieChart },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname();

    return (
        <div className={cn("flex h-screen w-72 flex-col border-r border-border bg-card", className)}>
            <div className="flex h-24 items-center gap-3 px-8 border-b border-border/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-primary to-indigo-400 text-white shadow-lg shadow-primary/20">
                    <Zap className="h-5 w-5 fill-current" />
                </div>
                <div>
                    <span className="block text-lg font-black tracking-tight text-foreground leading-none">
                        SWIFT<span className="text-primary">APPS</span>
                    </span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        OS v1.0
                    </span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto py-8">
                <nav className="space-y-1.5 px-4 text-sm font-medium">
                    {navigation.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={cn(
                                    "group flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200",
                                    isActive
                                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 translate-x-1"
                                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                                )}
                            >
                                <Icon className={cn("h-5 w-5 transition-colors", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary")} />
                                <span className="font-semibold tracking-tight">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="mt-auto border-t border-border/50 p-6 bg-secondary/30">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border border-border"></div>
                    <div className="text-xs">
                        <p className="font-bold text-foreground">Senior Developer</p>
                        <p className="text-primary font-bold uppercase tracking-wider">System Admin</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
