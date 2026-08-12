import React from "react";
import { User } from "lucide-react";
import type { PosTable, TableStatus } from "../../../packages/pos-core/src/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TableMapProps {
  tables: PosTable[];
  selectedTableId: string | null;
  onSelect: (tableId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStatusLabel(status: TableStatus): string {
  switch (status) {
    case "empty":
      return "Trống";
    case "occupied":
      return "Có khách";
    case "waiting_payment":
      return "Chờ thanh toán";
  }
}

function getStatusColor(status: TableStatus): string {
  switch (status) {
    case "empty":
      return "border-success bg-success/10 text-success-foreground";
    case "occupied":
      return "border-primary bg-primary/10 text-espresso";
    case "waiting_payment":
      return "border-warning bg-warning/10 text-espresso";
  }
}

// ---------------------------------------------------------------------------
// TableCard – extracted from App.tsx; visual classes preserved exactly
// ---------------------------------------------------------------------------

interface TableCardProps {
  table: PosTable;
  selected: boolean;
  onClick: () => void;
}

function TableCard({ table, selected, onClick }: TableCardProps) {
  const statusColor = getStatusColor(table.status);

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-start justify-between rounded-xl border-2 p-3 text-left transition-all active:scale-95 sm:p-4 ${
        selected ? "border-primary ring-2 ring-primary/30" : "border-border"
      } ${statusColor}`}
    >
      <span className="text-sm font-semibold sm:text-base">
        {`Bàn ${table.number}`}
      </span>
      <span className="mt-1 text-xs font-medium opacity-90">
        {getStatusLabel(table.status)}
      </span>
      {table.status === "occupied" && (
        <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// TableMap – grid of TableCards, sorted by number asc then id
// ---------------------------------------------------------------------------

export function TableMap({ tables, selectedTableId, onSelect }: TableMapProps) {
  const sorted = [...tables].sort((a, b) => {
    if (a.number !== b.number) return a.number - b.number;
    return a.id.localeCompare(b.id);
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-12 text-muted-foreground">
        <p className="text-sm">Chưa có bàn để hiển thị</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
      {sorted.map((table) => (
        <TableCard
          key={table.id}
          table={table}
          selected={table.id === selectedTableId}
          onClick={() => onSelect(table.id)}
        />
      ))}
    </div>
  );
}
