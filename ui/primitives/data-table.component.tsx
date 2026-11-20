"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, Search } from "lucide-react";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];
  searchPlaceholder?: string;
  emptyMessage?: string;
  initialSort?: SortingState;
  onRowClick?: (row: TData) => void;
  rowClassName?: (row: TData, index: number) => string;
}

export function DataTable<TData>({
  data,
  columns,
  searchPlaceholder = "Search...",
  emptyMessage = "No records found.",
  initialSort = [],
  onRowClick,
  rowClassName,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const [globalFilter, setGlobalFilter] = useState("");

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="w-full space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-8 pr-3 py-1.5 text-[13px] bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200 rounded-lg shadow-2xs focus:outline-none focus:border-emerald-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono-nums shrink-0">
          {table.getFilteredRowModel().rows.length} rows
        </span>
      </div>

      <div className="w-full overflow-x-auto border border-slate-200/90 rounded-xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)]">
        <table className="w-full text-[13px] border-collapse text-left">
          <thead className="bg-gradient-to-r from-slate-50 via-emerald-50/40 to-teal-50/30 border-b border-slate-200 text-slate-600">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  return (
                    <th
                      key={header.id}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      className={`py-2.5 px-4 text-[11px] font-semibold uppercase tracking-wide select-none ${
                        canSort ? "cursor-pointer hover:text-slate-950" : ""
                      }`}
                    >
                      <div className="inline-flex items-center gap-1.5">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                        {canSort && (
                          <span className="text-slate-400">
                            {sorted === "asc" ? (
                              <ArrowUp className="w-3 h-3 text-emerald-600" />
                            ) : sorted === "desc" ? (
                              <ArrowDown className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <ArrowUpDown className="w-3 h-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 px-4 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, index) => (
                <tr
                  key={row.id}
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={`hover:bg-emerald-50/40 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  } ${rowClassName ? rowClassName(row.original, index) : ""}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-2.5 px-4 font-mono-nums text-slate-700">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
