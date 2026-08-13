import { useState } from "react";
import { Receipt, TrendingUp, Users, Wallet } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency, REVENUE_BY_DAY, TOP_ITEMS } from "@/lib/pos";

const RANGES = ["Hôm nay", "7 ngày", "Tháng này"] as const;
const STATS = [
  { label: "Doanh thu", value: formatCurrency(18470000), icon: Wallet, note: "+12% so với tuần trước" },
  { label: "Số đơn", value: "432", icon: Receipt, note: "+8% so với tuần trước" },
  { label: "Trung bình/đơn", value: formatCurrency(42750), icon: TrendingUp, note: "Ổn định" },
  { label: "Lượt khách", value: "612", icon: Users, note: "+5% so với tuần trước" },
];

export function ReportsPanel() {
  const [range, setRange] = useState<(typeof RANGES)[number]>("7 ngày");
  const maxRevenue = 4050000;
  return <div className="flex h-full flex-col gap-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-foreground">Báo cáo</h2><p className="text-xs text-muted-foreground">Tổng quan kinh doanh</p></div><div className="flex gap-2">{RANGES.map((item) => <button key={item} type="button" aria-pressed={range === item} onClick={() => setRange(item)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${range === item ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{item}</button>)}</div></div>
    <ScrollArea className="-mx-1 flex-1 px-1"><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{STATS.map((stat) => { const Icon = stat.icon; return <div key={stat.label} className="rounded-xl border border-border bg-card p-3"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{stat.label}</span><Icon className="h-4 w-4 text-primary" /></div><p className="mt-1 text-lg font-bold text-card-foreground">{stat.value}</p><p className="mt-0.5 text-[11px] text-muted-foreground">{stat.note}</p></div>; })}</div>
      <div className="mt-4 rounded-xl border border-border bg-card p-4"><h3 className="mb-4 text-sm font-semibold text-card-foreground">Doanh thu theo ngày</h3><div className="flex h-44 items-end gap-2">{REVENUE_BY_DAY.map((day) => <div key={day.day} className="flex flex-1 flex-col items-center gap-2"><span className="text-[10px] text-muted-foreground">{Math.round(day.revenue / 1000)}k</span><div className="w-full rounded-t-md bg-primary/80 transition-all" style={{ height: `${(day.revenue / maxRevenue) * 100}%` }} /><span className="text-xs font-medium text-muted-foreground">{day.day}</span></div>)}</div></div>
      <div className="mt-4 rounded-xl border border-border bg-card p-4"><h3 className="mb-3 text-sm font-semibold text-card-foreground">Món bán chạy nhất</h3><div className="flex flex-col gap-2">{TOP_ITEMS.map((item, index) => <div key={item.name} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 p-2.5"><div className="flex min-w-0 items-center gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{item.name}</p><p className="text-xs text-muted-foreground">{item.sold} phần</p></div></div><Badge variant="secondary" className="shrink-0 text-xs">{formatCurrency(item.revenue)}</Badge></div>)}</div></div>
    </ScrollArea>
  </div>;
}
