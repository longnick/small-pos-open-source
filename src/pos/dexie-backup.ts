import { exportBackup, importBackup } from "../../packages/pos-storage/src/backup";
import { PosDatabase } from "../../packages/pos-storage/src/db";
import { useCatalogTableStore } from "../stores/catalog-table-store";
import { useOrderPaymentStore } from "../stores/order-payment-store";
import { hydrateFromDexie } from "./dexie-hydrate";
import { isDexiePersistSession } from "./dexie-persist";

export type DexieBackupInput = {
  authenticatedTenantId: string;
  databaseName?: string;
};

export type ImportDexieBackupResult = "imported" | "imported-unusable" | false;

const isPrimitiveNonemptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export async function exportDexieBackup(input: DexieBackupInput): Promise<string | null> {
  if (!isDexiePersistSession()) return null;
  if (!input || !isPrimitiveNonemptyString(input.authenticatedTenantId)) return null;
  const database = new PosDatabase(input.databaseName ?? "small-pos");
  try {
    await database.open();
    return await exportBackup(database);
  } catch {
    return null;
  } finally {
    database.close();
  }
}

export async function importDexieBackup(
  input: DexieBackupInput,
  json: string,
): Promise<ImportDexieBackupResult> {
  if (!isDexiePersistSession()) return false;
  if (!input || !isPrimitiveNonemptyString(input.authenticatedTenantId)) return false;
  if (typeof json !== "string") return false;
  const database = new PosDatabase(input.databaseName ?? "small-pos");
  try {
    await database.open();
    await importBackup(database, json);
  } catch {
    database.close();
    return false;
  }
  database.close();

  useOrderPaymentStore.getState().clearCurrentOrder();
  try {
    const hydrated = await hydrateFromDexie({
      authenticatedTenantId: input.authenticatedTenantId,
      databaseName: input.databaseName,
    });
    if (hydrated && useCatalogTableStore.getState().replaceTenantData(input.authenticatedTenantId, hydrated)) {
      return "imported";
    }
  } catch {
    // Dexie already replaced. Fall through to clear stale memory.
  }
  useCatalogTableStore.getState().clear();
  return "imported-unusable";
}

export async function importDexieRecoveryBackup(
  input: { databaseName?: string },
  json: string,
): Promise<boolean> {
  if (!input || typeof json !== "string") return false;
  const database = new PosDatabase(input.databaseName ?? "small-pos");
  try {
    await database.open();
    await importBackup(database, json);
    return true;
  } catch {
    return false;
  } finally {
    database.close();
  }
}
