import { useState } from "react";
import { Clock, LogIn, Phone, Plus, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { INITIAL_STAFF } from "@/lib/pos";

const SHIFTS = ["Ca sáng", "Ca chiều", "Ca tối"] as const;

export function StaffManagement() {
  const [shiftFilter, setShiftFilter] = useState<string>("all");
  const visible = INITIAL_STAFF.filter((staff) => shiftFilter === "all" || staff.shift === shiftFilter);

  return <div className="flex h-full flex-col gap-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-foreground">Nhân sự</h2><p className="text-xs text-muted-foreground">{INITIAL_STAFF.length} nhân viên · 4 đang làm</p></div><Button className="h-9 bg-primary text-primary-foreground sm:w-auto" onClick={() => undefined}><Plus className="mr-1 h-4 w-4" />Thêm nhân viên</Button></div>
    <div className="flex flex-wrap gap-2">{["all", ...SHIFTS].map((shift) => <button key={shift} type="button" aria-pressed={shiftFilter === shift} onClick={() => setShiftFilter(shift)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${shiftFilter === shift ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{shift === "all" ? "Tất cả ca" : shift}</button>)}</div>
    <div className="grid grid-cols-3 gap-2">{[{ label: "Đang trong ca", value: "4" }, { label: "Lượt chấm công", value: "12" }, { label: "Giờ làm hôm nay", value: "32h00" }].map((item) => <div key={item.label} className="rounded-xl border border-border bg-card p-2.5"><p className="text-[11px] text-muted-foreground">{item.label}</p><p className="text-base font-bold text-card-foreground">{item.value}</p></div>)}</div>
    <ScrollArea className="-mx-1 flex-1 px-1"><div className="grid gap-2 lg:grid-cols-2">{visible.map((staff) => <div key={staff.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-secondary-foreground">{staff.name.split(" ").slice(-1)[0]?.[0] ?? "?"}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-semibold text-card-foreground">{staff.name}</p><Badge className={staff.status === "Đang làm" ? "bg-success/15 text-espresso text-[10px]" : "bg-secondary text-muted-foreground text-[10px]"}>{staff.status}</Badge></div><p className="text-xs text-muted-foreground">{staff.role} · {staff.shift} · {staff.hoursThisWeek}h/tuần</p><p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{staff.phone || "—"}</p><p className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-primary"><Clock className="h-3 w-3" />Vào ca lúc 08:00</p></div><div className="flex flex-col gap-1"><Button variant="default" size="sm" className="h-7 px-2 text-[11px] bg-primary text-primary-foreground" onClick={() => undefined}><LogIn className="mr-1 h-3 w-3" />Xem mẫu</Button><button className="flex h-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => undefined}><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}</div><div className="mt-4"><h3 className="mb-2 text-sm font-bold text-foreground">Lịch sử chấm công</h3><p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Dữ liệu minh họa, không lưu chấm công.</p></div></ScrollArea>
  </div>;
}
