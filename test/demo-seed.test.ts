import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import {
  DEMO_CATALOG,
  DEMO_GROUPS,
  DEMO_STAFF,
  DEMO_TENANT,
} from "../src/data/demo-seed";

const bannedBrandPolicies = [
  /xe\s*kh[ôo]/iu,
  /ch[ữu]a\s*l[àa]nh/iu,
  /cafe\s+companion(?:\s+pos)?/iu,
  /firebaseConfig/iu,
  /\bauthDomain\s*:/iu,
  /\bapiKey\s*:/iu,
  /\bprojectId\s*:/iu,
  /AIza/u,
  /973225282530124/u,
];
const validRoles = new Set(["manager", "cashier", "staff", "kitchen"]);

const expectedTenant = {
  id: "tenant-demo",
  name: "Quán Demo",
  address: "123 Đường ABC, Phường 1, TP.HCM",
  phone: "0901234567",
  currency: "VND",
  tableCount: 5,
};
const expectedGroups = [
  { id: "drinks", name: "Nước uống" },
  { id: "food", name: "Đồ ăn" },
];
const expectedCatalog = [
  { id: "coffee-black", groupId: "drinks", name: "Cà phê đen", price: 25000 },
  { id: "lemon-tea", groupId: "drinks", name: "Trà chanh", price: 20000 },
  { id: "fried-rice", groupId: "food", name: "Cơm rang", price: 45000 },
  { id: "stir-fried-noodles", groupId: "food", name: "Mì xào", price: 40000 },
  { id: "water", groupId: "drinks", name: "Nước suối", price: 10000 },
];
const expectedStaff = [
  { id: "manager", name: "Manager", pin: "0000", role: "manager" },
  { id: "cashier", name: "Thu ngân", pin: "1111", role: "cashier" },
  { id: "staff-a", name: "Nhân viên A", pin: "2222", role: "staff" },
  { id: "kitchen", name: "Bếp", pin: "3333", role: "kitchen" },
];

describe("demo seed", () => {
  test("matches Task 0.7 contract exactly", () => {
    expect(DEMO_TENANT).toEqual(expectedTenant);
    expect(DEMO_GROUPS).toEqual(expectedGroups);
    expect(DEMO_CATALOG).toEqual(expectedCatalog);
    expect(DEMO_STAFF).toEqual(expectedStaff);
  });

  test("preserves seed invariants", () => {
    expect(DEMO_CATALOG.every(({ price }) => Number.isInteger(price) && price > 0)).toBe(true);

    const ids = [...DEMO_GROUPS, ...DEMO_CATALOG, ...DEMO_STAFF].map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);

    const groupIds = new Set(DEMO_GROUPS.map(({ id }) => id));
    expect(DEMO_CATALOG.every(({ groupId }) => groupIds.has(groupId))).toBe(true);
    expect(DEMO_STAFF.every(({ role }) => validRoles.has(role))).toBe(true);
  });

  test("stays isolated from runtime dependencies", async () => {
    const source = await readFile(resolve("src/data/demo-seed.ts"), "utf8");

    expect(source).not.toMatch(/^\s*import\s/m);
    expect(source).not.toMatch(/^\s*export\s.+\sfrom\s/m);
    expect(source).not.toMatch(/\b(?:db|database|storage|store|react|hooks?)\b/iu);
  });

  test("contains no leakage-scanner policy terms", () => {
    const seedText = JSON.stringify({ DEMO_TENANT, DEMO_GROUPS, DEMO_CATALOG, DEMO_STAFF });

    for (const policy of bannedBrandPolicies) expect(seedText).not.toMatch(policy);
  });
});
