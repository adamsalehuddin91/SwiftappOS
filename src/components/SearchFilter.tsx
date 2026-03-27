"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";

interface SearchFilterProps {
  placeholder?: string;
  statusOptions?: { label: string; value: string }[];
  onSearch: (search: string) => void;
  onStatusChange?: (status: string) => void;
  currentSearch?: string;
  currentStatus?: string;
}

export function SearchFilter({
  placeholder = "Search...",
  statusOptions,
  onSearch,
  onStatusChange,
  currentSearch = "",
  currentStatus = "",
}: SearchFilterProps) {
  const [search, setSearch] = useState(currentSearch);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, onSearch]);

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border/50 bg-secondary/30 px-9 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
        />
      </div>
      {statusOptions && onStatusChange && (
        <select
          value={currentStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="rounded-lg border border-border/50 bg-secondary/30 px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
        >
          <option value="">All Status</option>
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
