import "fake-indexeddb/auto";
import { expect, test } from "vitest";
import type { PosTable, Staff, Tenant } from "../../pos-core/src/types";
import { PosDatabase } from "../src/db";

test("opens exact v1 schema with isolated typed records and indexes", async () => {
  const database = new PosDatabase(`pos-storage-test-${crypto.randomUUID()}`);
  const tenant: Tenant = {
    id: "tenant-1",
    name: "Test Cafe",
    address: "1 Test Street",
    phone: "0123456789",
    currency: "VND",
    defaultTax: 0,
    defaultSurcharge: 0,
    tableCount: 1,
    createdAt: 0,
  };
  const staff: Staff = {
    id: "staff-1",
    tenantId: tenant.id,
    name: "Test Staff",
    role: "manager",
    pinHash: "hash",
    createdAt: 0,
  };
  const posTable: PosTable = {
    id: "table-1",
    tenantId: tenant.id,
    number: 1,
    status: "empty",
    openedAt: 0,
    staffId: staff.id,
  };

  try {
    await database.open();
    await database.tenants.add(tenant);
    await database.staff.add(staff);
    await database.posTables.add(posTable);

    expect(database.verno).toBe(2);
    expect(database.tables.map(({ name }) => name).sort()).toEqual([
      "appConfig",
      "auditLog",
      "catalogGroups",
      "catalogItems",
      "orders",
      "payments",
      "shifts",
      "staff",
      "tables",
      "tenants",
    ]);
    expect(database.payments.schema.indexes.map(({ name }) => name)).toContain("createdAt");
    expect(database.payments.schema.indexes.map(({ name }) => name)).not.toContain("paidAt");
    expect(database.staff.schema.indexes.map(({ name }) => name)).toContain("pinHash");
    expect(database.staff.schema.indexes.map(({ name }) => name)).not.toContain("pin");
    await expect(database.tenants.get(tenant.id)).resolves.toEqual(tenant);
    await expect(database.staff.where("tenantId").equals(tenant.id).toArray()).resolves.toEqual([staff]);
    await expect(database.posTables.where("tenantId").equals(tenant.id).toArray()).resolves.toEqual([posTable]);
  } finally {
    database.close();
    await database.delete();
  }
});
