import Dexie, { type EntityTable } from "dexie";
import type {
  AuditEntry,
  CatalogGroup,
  CatalogItem,
  Order,
  Payment,
  PosTable,
  Shift,
  Staff,
  Tenant,
} from "../../pos-core/src/types";

export class PosDatabase extends Dexie {
  tenants!: EntityTable<Tenant, "id">;
  staff!: EntityTable<Staff, "id">;
  catalogGroups!: EntityTable<CatalogGroup, "id">;
  catalogItems!: EntityTable<CatalogItem, "id">;
  orders!: EntityTable<Order, "id">;
  payments!: EntityTable<Payment, "id">;
  shifts!: EntityTable<Shift, "id">;
  auditLog!: EntityTable<AuditEntry, "id">;

  get posTables() {
    return this.table<PosTable, "id">("tables");
  }

  constructor(databaseName = "small-pos") {
    super(databaseName);

    this.version(1).stores({
      tenants: "id",
      staff: "id, tenantId, pinHash",
      catalogGroups: "id, tenantId",
      catalogItems: "id, tenantId, groupId, [tenantId+available]",
      tables: "id, tenantId, number",
      orders: "id, tenantId, tableId, status, createdAt",
      payments: "id, orderId, tenantId, createdAt",
      shifts: "id, tenantId, staffId, openedAt",
      auditLog: "id, tenantId, timestamp, action",
    });
  }
}

export const db = new PosDatabase();
