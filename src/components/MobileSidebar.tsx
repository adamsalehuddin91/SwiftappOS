
"use client";

import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

export function MobileSidebar() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <Button
                variant="ghost"
                size="icon"
                className="md:hidden fixed top-4 left-4 z-50 bg-white/80 backdrop-blur-sm border shadow-sm"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden animate-in fade-in"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Container */}
            <div className={`fixed inset-y-0 left-0 z-40 bg-background transform transition-transform duration-200 ease-in-out border-r shadow-xl md:hidden ${isOpen ? "translate-x-0" : "-translate-x-full"
                }`}>
                <Sidebar className="w-64 h-full" />
            </div>
        </>
    );
}
