"use client";

import React from "react";

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

interface ResponsiveTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function ResponsiveTable<T extends Record<string, unknown>>({
  columns,
  data,
  onRowClick,
  emptyMessage = "No data found.",
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="px-6 py-8 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-secondary/50 text-xs uppercase font-bold tracking-wider text-muted-foreground">
              {columns.map((col) => (
                <th key={col.key} className={`px-6 py-4 ${col.className ?? ""}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((item, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(item)}
                className={`group hover:bg-secondary/30 transition-colors ${
                  onRowClick ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-6 py-4 ${col.className ?? ""}`}>
                    {col.render
                      ? col.render(item)
                      : String(item[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3 p-4">
        {data.map((item, i) => (
          <div
            key={i}
            onClick={() => onRowClick?.(item)}
            className={`rounded-lg border border-border/50 bg-secondary/20 p-4 space-y-2 ${
              onRowClick ? "cursor-pointer active:bg-secondary/40" : ""
            }`}
          >
            {columns.map((col) => (
              <div key={col.key} className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {col.label}
                </span>
                <span className="text-sm text-foreground">
                  {col.render ? col.render(item) : String(item[col.key] ?? "")}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
