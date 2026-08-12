import type { CatalogGroup, CatalogItem, Order, PosTable } from "../../packages/pos-core/src/types";

export type DemoPosBootstrap = {
  catalogGroups: CatalogGroup[];
  catalogItems: CatalogItem[];
  tables: PosTable[];
  currentOrder: Order | null;
};

/** Production demo starts empty. E2E replaces this module at build time. */
export async function bootstrapDemoPos(): Promise<DemoPosBootstrap | null> {
  return null;
}
