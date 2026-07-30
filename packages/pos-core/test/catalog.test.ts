import { expect, test } from "vitest";
import type { CatalogGroup, CatalogItem } from "../src/types";

const group: CatalogGroup = {
  id: "group-coffee",
  tenantId: "tenant-demo",
  name: "Coffee",
  sortOrder: 0,
};

const item: CatalogItem = {
  id: "item-espresso",
  tenantId: "tenant-demo",
  groupId: group.id,
  name: "Espresso",
  price: 30000,
  available: true,
  sortOrder: 0,
  createdAt: 0,
  updatedAt: 0,
};

test("catalog fixture uses integer VND price and contract fields", () => {
  expect(Number.isInteger(item.price)).toBe(true);
  expect(item).toMatchObject({ tenantId: group.tenantId, groupId: group.id });
});
