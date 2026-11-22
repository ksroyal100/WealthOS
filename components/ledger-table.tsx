'use client';
import { useState } from 'react';
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState } from '@tanstack/react-table';

export type Row = { id: string; occurred_on: string; kind: string; category: string; status: string; amount: string; currency: string; description: string | null };

const cols: ColumnDef<Row>[] = [
  { accessorKey: 'occurred_on', header: 'Date' },
  { accessorKey: 'kind', header: 'Type' },
  { accessorKey: 'category', header: 'Category' },
  { accessorKey: 'status', header: 'Status' },
  { accessorKey: 'description', header: 'Description' },
  { accessorKey: 'amount', header: 'Amount', cell: (c) => <span className="tabular-nums">{c.row.original.currency} {c.getValue<string>()}</span> },
];

export default function LedgerTable({ rows }: { rows: Row[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const t = useReactTable({ data: rows, columns: cols, state: { sorting }, onSortingChange: setSorting, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel() });
  return (
    <div className="overflow-x-auto rounded-lg border border-[#DDE3E9] bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-[#F3F5F7]">{t.getHeaderGroups().map((g) => <tr key={g.id}>{g.headers.map((h) => (
          <th key={h.id} className="cursor-pointer px-3 py-2 font-medium" onClick={h.column.getToggleSortingHandler()} aria-sort={h.column.getIsSorted() === 'asc' ? 'ascending' : h.column.getIsSorted() === 'desc' ? 'descending' : 'none'}>
            {flexRender(h.column.columnDef.header, h.getContext())}</th>))}</tr>)}</thead>
        <tbody>{t.getRowModel().rows.length === 0 ? <tr><td colSpan={cols.length} className="px-3 py-6 text-center text-slate-600">No transactions match these filters.</td></tr> :
          t.getRowModel().rows.map((r) => <tr key={r.id} className="border-t border-[#EEF1F4]">{r.getVisibleCells().map((c) => <td key={c.id} className="px-3 py-2">{flexRender(c.column.columnDef.cell, c.getContext())}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
