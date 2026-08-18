import { PosDatabase } from "../../packages/pos-storage/src/db";
import type { CatalogGroup, CatalogItem, PosTable } from "../../packages/pos-core/src/types";
import {
  isCatalogGroupRecord,
  isCatalogItemRecord,
  isPlainObject,
  isPosTableRecord,
  isTenantRecord,
} from "../../packages/pos-core/src/product-records";

export type DexieHydrateInput = {
  authenticatedTenantId: string;
  databaseName?: string;
};

export type DexieHydrateResult = {
  catalogGroups: CatalogGroup[];
  catalogItems: CatalogItem[];
  tables: PosTable[];
};

const isPrimitiveNonemptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

const materializeRecord = (value: unknown): Record<string, unknown> | null => {
  if (!isPlainObject(value)) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).some((key) => !("value" in descriptors[key as keyof typeof descriptors]))) return null;
  return Object.fromEntries(Reflect.ownKeys(descriptors).map((key) => [key, descriptors[key as keyof typeof descriptors].value]));
};

const isTenant = (value: Record<string, unknown>) => isTenantRecord(value);
const isCatalogGroup = (value: Record<string, unknown>) => isCatalogGroupRecord(value);
const isCatalogItem = (value: Record<string, unknown>) => isCatalogItemRecord(value);
const isPosTable = (value: Record<string, unknown>) => isPosTableRecord(value);

const hasDuplicate = <T extends { id: string }>(records: T[]) => new Set(records.map(({ id }) => id)).size !== records.length;

export async function hydrateFromDexie(input: DexieHydrateInput): Promise<DexieHydrateResult | null> {
  try {
    if (!input || !isPrimitiveNonemptyString(input.authenticatedTenantId)) return null;
    const database = new PosDatabase(input.databaseName ?? "small-pos");
    try {
      await database.open();
      const snapshot = await database.transaction(
        "r",
        ["tenants", "catalogGroups", "catalogItems", "tables"],
        async () => ({
          tenants: await database.tenants.toArray(),
          catalogGroups: await database.catalogGroups.toArray(),
          catalogItems: await database.catalogItems.toArray(),
          tables: await database.posTables.toArray(),
        }),
      );

      if (snapshot.tenants.length !== 1) return null;
      const tenantRecord = materializeRecord(snapshot.tenants[0]);
      if (!tenantRecord || !isTenant(tenantRecord) || tenantRecord.id !== input.authenticatedTenantId) return null;

      const groups = snapshot.catalogGroups.map(materializeRecord);
      const items = snapshot.catalogItems.map(materializeRecord);
      const tables = snapshot.tables.map(materializeRecord);
      if (
        groups.some((record) => !record || !isCatalogGroup(record))
        || items.some((record) => !record || !isCatalogItem(record))
        || tables.some((record) => !record || !isPosTable(record))
      ) return null;

      const validGroups = groups as (Record<string, unknown> & CatalogGroup)[];
      const validItems = items as (Record<string, unknown> & CatalogItem)[];
      const validTables = tables as (Record<string, unknown> & PosTable)[];
      if (
        hasDuplicate(validGroups)
        || hasDuplicate(validItems)
        || hasDuplicate(validTables)
        || validGroups.some((record) => record.tenantId !== input.authenticatedTenantId)
        || validItems.some((record) => record.tenantId !== input.authenticatedTenantId)
        || validTables.some((record) => record.tenantId !== input.authenticatedTenantId)
      ) return null;

      const groupIds = new Set(validGroups.map(({ id }) => id));
      if (
        validItems.some(({ groupId }) => !groupIds.has(groupId))
        || new Set(validTables.map(({ number }) => number)).size !== validTables.length
      ) return null;

      return {
        catalogGroups: validGroups.map((record) => ({ ...record })),
        catalogItems: validItems.map((record) => ({ ...record })),
        tables: validTables.map((record) => ({ ...record })),
      };
    } finally {
      database.close();
    }
  } catch {
    return null;
  }
}
