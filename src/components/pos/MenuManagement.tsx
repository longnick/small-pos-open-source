import { useState } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CATEGORIES, INITIAL_MENU_ITEMS, formatCurrency, getCategoryName } from "@/lib/pos";

export function MenuManagement() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const visible = INITIAL_MENU_ITEMS.filter((item) => (filter === "all" || item.category === filter) && item.name.toLowerCase().includes(search.trim().toLowerCase()));

  return <div className="flex h-full flex-col gap-3">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold text-foreground">Quản lý món</h2><p className="text-xs text-muted-foreground">{INITIAL_MENU_ITEMS.length} món · {INITIAL_MENU_ITEMS.filter((item) => item.available === false).length} tạm hết</p></div><div className="flex items-center gap-2"><div className="relative flex-1"><Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Tìm món..." value={search} onChange={(event) => setSearch(event.target.value)} className="h-9 pl-9 text-sm" /></div><Button className="h-9 shrink-0 bg-primary text-primary-foreground" onClick={() => undefined}><Plus className="mr-1 h-4 w-4" />Thêm món</Button></div></div>
    <div className="flex flex-wrap gap-2"><button onClick={() => setFilter("all")} className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>Tất cả</button>{CATEGORIES.map((category) => <button key={category.id} onClick={() => setFilter(category.id)} className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${filter === category.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>{category.name}</button>)}</div>
    <ScrollArea className="-mx-1 flex-1 px-1"><div className="flex flex-col gap-2">{visible.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3"><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate font-semibold text-card-foreground">{item.name}</p>{item.popular && <Badge className="bg-accent text-accent-foreground text-[10px]">Bán chạy</Badge>}{item.available === false && <Badge variant="outline" className="text-[10px] text-muted-foreground">Tạm hết</Badge>}</div><p className="text-xs text-muted-foreground">{getCategoryName(item.category)} · {formatCurrency(item.price)}</p></div><div className="flex items-center gap-1"><Button variant="outline" size="sm" className="h-8 px-2 text-xs" onClick={() => undefined}>{item.available === false ? "Mở bán" : "Tạm hết"}</Button><button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary" onClick={() => undefined}><Pencil className="h-4 w-4" /></button><button className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick={() => undefined}><Trash2 className="h-4 w-4" /></button></div></div>)}{visible.length === 0 && <div className="py-12 text-center text-sm text-muted-foreground">Không có món nào</div>}</div></ScrollArea>
  </div>;
}
