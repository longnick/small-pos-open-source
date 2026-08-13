import { useState } from "react";
import { ChefHat, CheckCircle2, Flame, Timer, Utensils } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const FILTERS = ["Đang xử lý", "Chờ làm", "Đang làm", "Sẵn sàng", "Đã phục vụ"] as const;
const TICKETS = [
  { id: "k1", tableName: "Bàn 1", code: "#001", time: "10:15", status: "Đang làm", lines: [{ name: "Cà phê đen", quantity: 2 }, { name: "Cơm gà", quantity: 1 }] },
  { id: "k2", tableName: "Bàn 2", code: "#002", time: "10:20", status: "Chờ làm", lines: [{ name: "Cà phê sữa", quantity: 1 }, { name: "Trà đào", quantity: 1 }] },
];

export function KitchenPanel() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("Đang xử lý");
  const visible = filter === "Đang xử lý" ? TICKETS : TICKETS.filter((ticket) => ticket.status === filter);
  const counts = { "Chờ làm": 1, "Đang làm": 1, "Sẵn sàng": 0 };

  return (
    <div className="flex h-full flex-col gap-3">
      <div>
        <h2 className="text-lg font-bold text-foreground">Bếp</h2>
        <p className="text-xs text-muted-foreground">{counts["Chờ làm"]} chờ làm · {counts["Đang làm"]} đang làm · {counts["Sẵn sàng"]} sẵn sàng</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Chờ làm", value: counts["Chờ làm"], icon: Timer },
          { label: "Đang làm", value: counts["Đang làm"], icon: Flame },
          { label: "Sẵn sàng", value: counts["Sẵn sàng"], icon: CheckCircle2 },
        ].map((k) => { const Icon = k.icon; return <div key={k.label} className="rounded-xl border border-border bg-card p-2.5"><p className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"><Icon className="h-3 w-3" />{k.label}</p><p className="text-base font-bold text-card-foreground">{k.value}</p></div>; })}
      </div>
      <div className="flex flex-wrap gap-2">{FILTERS.map((item) => <button key={item} type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filter === item ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{item}</button>)}</div>
      <ScrollArea className="-mx-1 flex-1 px-1">
        {visible.length === 0 ? <div className="flex flex-col items-center justify-center py-12 text-muted-foreground" role="status" aria-label="Chưa có phiếu bếp nào"><ChefHat className="mb-2 h-10 w-10 opacity-40" aria-hidden="true" /><p className="text-sm">Chưa có phiếu bếp nào</p></div> : <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">{visible.map((ticket) => <div key={ticket.id} className="flex flex-col rounded-xl border border-border bg-card p-3"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold text-card-foreground">{ticket.tableName}</p><p className="text-[11px] text-muted-foreground">{ticket.code} · {ticket.time}</p></div><Badge className="text-[10px] bg-primary/15 text-espresso">{ticket.status}</Badge></div><ul className="my-2 flex flex-col gap-1">{ticket.lines.map((line) => <li key={line.name} className="flex items-center justify-between text-sm text-card-foreground"><span className="truncate">{line.name}</span><span className="ml-2 shrink-0 font-semibold">x{line.quantity}</span></li>)}</ul><div className="mt-auto flex gap-2"><Button size="sm" className="h-8 flex-1 bg-primary text-xs text-primary-foreground" onClick={() => undefined}><Utensils className="mr-1 h-3 w-3" />Xem mẫu</Button><Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => undefined}>Hủy</Button></div></div>)}</div>}
      </ScrollArea>
    </div>
  );
}
