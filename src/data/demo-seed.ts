export type DemoTenant = {
  id: string;
  name: string;
  address: string;
  phone: string;
  currency: "VND";
  tableCount: number;
};

export type DemoGroup = { id: string; name: string };

export type DemoCatalogItem = {
  id: string;
  groupId: string;
  name: string;
  price: number;
};

export type DemoRole = "manager" | "cashier" | "staff" | "kitchen";

export type DemoStaff = {
  id: string;
  name: string;
  pin: string;
  role: DemoRole;
};

export const DEMO_TENANT: DemoTenant = {
  id: "tenant-demo",
  name: "Quán Demo",
  address: "123 Đường ABC, Phường 1, TP.HCM",
  phone: "0901234567",
  currency: "VND",
  tableCount: 5,
};

export const DEMO_GROUPS: DemoGroup[] = [
  { id: "drinks", name: "Nước uống" },
  { id: "food", name: "Đồ ăn" },
];

export const DEMO_CATALOG: DemoCatalogItem[] = [
  { id: "coffee-black", groupId: "drinks", name: "Cà phê đen", price: 25000 },
  { id: "lemon-tea", groupId: "drinks", name: "Trà chanh", price: 20000 },
  { id: "fried-rice", groupId: "food", name: "Cơm rang", price: 45000 },
  { id: "stir-fried-noodles", groupId: "food", name: "Mì xào", price: 40000 },
  { id: "water", groupId: "drinks", name: "Nước suối", price: 10000 },
];

export const DEMO_STAFF: DemoStaff[] = [
  { id: "manager", name: "Manager", pin: "0000", role: "manager" },
  { id: "cashier", name: "Thu ngân", pin: "1111", role: "cashier" },
  { id: "staff-a", name: "Nhân viên A", pin: "2222", role: "staff" },
  { id: "kitchen", name: "Bếp", pin: "3333", role: "kitchen" },
];
