import { PosDatabase } from "../../packages/pos-storage/src/db";
import type { CatalogGroup, CatalogItem, PosTable, Staff, Tenant } from "../../packages/pos-core/src/types";
import type { PinHashVerifier } from "../../packages/pos-core/src/auth";
import { hydrateFromDexie } from "./dexie-hydrate";
import { readProductSetupState, verifyStoredPin } from "./product-setup";

export type ProductBootstrap =
  | { kind: "needs-setup" }
  | { kind: "corrupt" }
  | {
      kind: "ready";
      tenant: Tenant;
      staff: Staff[];
      tables: PosTable[];
      catalogGroups: CatalogGroup[];
      catalogItems: CatalogItem[];
      verifier: PinHashVerifier;
      persistable: boolean;
    };

export type ProductBootstrapInput = {
  databaseName?: string;
};

const verifier: PinHashVerifier = (pin, pinHash) => verifyStoredPin(pin, pinHash);

export async function loadProductBootstrap(input: ProductBootstrapInput = {}): Promise<ProductBootstrap> {
  const database = new PosDatabase(input.databaseName ?? "small-pos");
  try {
    await database.open();
    const state = await readProductSetupState(database);
    if (state.kind === "needs-setup") return { kind: "needs-setup" };
    if (state.kind === "corrupt") return { kind: "corrupt" };

    const tenant = await database.tenants.get(state.tenantId);
    const staff = await database.staff.where("tenantId").equals(state.tenantId).toArray();
    if (!tenant || staff.length === 0) return { kind: "corrupt" };

    const hydrated = await hydrateFromDexie({
      authenticatedTenantId: state.tenantId,
      databaseName: database.name,
    });
    if (!hydrated) return { kind: "corrupt" };

    return {
      kind: "ready",
      tenant: { ...tenant },
      staff: staff.map((row) => ({ ...row })),
      tables: hydrated.tables,
      catalogGroups: hydrated.catalogGroups,
      catalogItems: hydrated.catalogItems,
      verifier,
      persistable: true,
    };
  } catch {
    return { kind: "corrupt" };
  } finally {
    database.close();
  }
}

export type { PinHashVerifier };
