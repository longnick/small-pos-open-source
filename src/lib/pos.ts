import {
  Coffee,
  UtensilsCrossed,
  GlassWater,
  Cake,
  Leaf,
} from "lucide-react";

export type Category = {
  id: string;
  name: string;
  icon: React.ElementType;
};

export const CATEGORIES: Category[] = [
  { id: "coffee", name: "Cà phê", icon: Coffee },
  { id: "tea", name: "Trà", icon: GlassWater },
  { id: "juice", name: "Nước ép", icon: Leaf },
  { id: "food", name: "Đồ ăn", icon: UtensilsCrossed },
  { id: "dessert", name: "Tráng miệng", icon: Cake },
];

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  category: string;
  popular?: boolean;
  available?: boolean;
};

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  { id: "c1", name: "Cà phê đen", price: 25000, category: "coffee", popular: true, available: true },
  { id: "c2", name: "Cà phê sữa", price: 30000, category: "coffee", popular: true, available: true },
  { id: "c3", name: "Bạc xỉu", price: 32000, category: "coffee", available: true },
  { id: "c4", name: "Espresso", price: 28000, category: "coffee", available: true },
  { id: "t1", name: "Trà đào", price: 35000, category: "tea", popular: true, available: true },
  { id: "t2", name: "Trà vải", price: 35000, category: "tea", available: true },
  { id: "t3", name: "Trà chanh", price: 28000, category: "tea", available: true },
  { id: "j1", name: "Nước cam", price: 30000, category: "juice", available: true },
  { id: "j2", name: "Nước dừa", price: 28000, category: "juice", popular: true, available: true },
  { id: "f1", name: "Cơm gà", price: 55000, category: "food", popular: true, available: true },
  { id: "f2", name: "Phở bò", price: 60000, category: "food", available: true },
  { id: "f3", name: "Bánh mì", price: 25000, category: "food", available: true },
  { id: "d1", name: "Tiramisu", price: 40000, category: "dessert", available: true },
  { id: "d2", name: "Bánh flan", price: 18000, category: "dessert", available: false },
];

export type TableStatus = "free" | "occupied" | "pending";

export type TableInfo = {
  id: number;
  name: string;
  status: TableStatus;
  guests?: number;
};

export type OrderLine = {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
  /** Số lượng đã chuyển xuống bếp */
  sentQty?: number;
};

export type KitchenTicketStatus = "queued" | "cooking" | "ready" | "served";

export type KitchenTicketLine = {
  itemId: string;
  name: string;
  quantity: number;
};

export type KitchenTicket = {
  id: string;
  code: string;
  tableId: number;
  tableName: string;
  lines: KitchenTicketLine[];
  status: KitchenTicketStatus;
  createdAt: number;
};

export const KITCHEN_STATUS_LABEL: Record<KitchenTicketStatus, string> = {
  queued: "Chờ làm",
  cooking: "Đang làm",
  ready: "Sẵn sàng",
  served: "Đã phục vụ",
};

export const KITCHEN_NEXT_STATUS: Record<
  KitchenTicketStatus,
  KitchenTicketStatus | null
> = {
  queued: "cooking",
  cooking: "ready",
  ready: "served",
  served: null,
};


export type Staff = {
  id: string;
  name: string;
  role: "Quản lý" | "Pha chế" | "Phục vụ" | "Bếp" | "Thu ngân";
  phone: string;
  shift: "Ca sáng" | "Ca chiều" | "Ca tối";
  status: "Đang làm" | "Nghỉ";
  hoursThisWeek: number;
};

export type AttendanceRecord = {
  id: string;
  staffId: string;
  staffName: string;
  shift: Staff["shift"];
  checkIn: number;
  checkOut?: number;
};

export function hoursBetween(start: number, end: number) {
  return Math.max(0, (end - start) / 3_600_000);
}

export function formatHours(h: number) {
  const totalMinutes = Math.round(h * 60);
  return `${Math.floor(totalMinutes / 60)}h${String(totalMinutes % 60).padStart(2, "0")}`;
}

export function formatClock(ts: number) {
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const INITIAL_STAFF: Staff[] = [
  { id: "s1", name: "Nguyễn Minh Anh", role: "Quản lý", phone: "0901 234 567", shift: "Ca sáng", status: "Đang làm", hoursThisWeek: 42 },
  { id: "s2", name: "Trần Bảo Long", role: "Pha chế", phone: "0902 345 678", shift: "Ca sáng", status: "Đang làm", hoursThisWeek: 38 },
  { id: "s3", name: "Lê Thu Hà", role: "Phục vụ", phone: "0903 456 789", shift: "Ca chiều", status: "Đang làm", hoursThisWeek: 30 },
  { id: "s4", name: "Phạm Quốc Huy", role: "Bếp", phone: "0904 567 890", shift: "Ca chiều", status: "Nghỉ", hoursThisWeek: 24 },
  { id: "s5", name: "Đỗ Khánh Vy", role: "Thu ngân", phone: "0905 678 901", shift: "Ca tối", status: "Đang làm", hoursThisWeek: 35 },
];

export function formatCurrency(value: number) {
  return value.toLocaleString("vi-VN", { style: "currency", currency: "VND" });
}

export function getCategoryName(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.name ?? id;
}

// --- Mock report data ---

export const REVENUE_BY_DAY = [
  { day: "T2", revenue: 1850000, orders: 42 },
  { day: "T3", revenue: 2100000, orders: 48 },
  { day: "T4", revenue: 1720000, orders: 39 },
  { day: "T5", revenue: 2480000, orders: 56 },
  { day: "T6", revenue: 3120000, orders: 71 },
  { day: "T7", revenue: 4050000, orders: 92 },
  { day: "CN", revenue: 3680000, orders: 84 },
];

export const TOP_ITEMS = [
  { name: "Cà phê sữa", sold: 128, revenue: 3840000 },
  { name: "Trà đào", sold: 96, revenue: 3360000 },
  { name: "Cơm gà", sold: 54, revenue: 2970000 },
  { name: "Cà phê đen", sold: 88, revenue: 2200000 },
  { name: "Nước dừa", sold: 61, revenue: 1708000 },
];
