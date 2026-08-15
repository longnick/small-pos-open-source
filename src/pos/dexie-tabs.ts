export const DEXIE_TAB_CHANNEL = "small-pos-dexie";

export type DexieTabKind = "occupy" | "edit" | "pay";

export type DexieTabEvent = {
  tenantId: string;
  kind: DexieTabKind;
};

const isPrimitiveNonemptyString = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const isKind = (value: unknown): value is DexieTabKind => value === "occupy" || value === "edit" || value === "pay";

export function parseDexieTabEvent(value: unknown): DexieTabEvent | null {
  if (!value || typeof value !== "object") return null;
  const record = value as { tenantId?: unknown; kind?: unknown };
  if (!isPrimitiveNonemptyString(record.tenantId) || !isKind(record.kind)) return null;
  return { tenantId: record.tenantId, kind: record.kind };
}

export function notifyDexieTabWrite(event: DexieTabEvent): void {
  const payload = parseDexieTabEvent(event);
  if (!payload) return;
  const Channel = globalThis.BroadcastChannel;
  if (typeof Channel !== "function") return;
  try {
    const channel = new Channel(DEXIE_TAB_CHANNEL);
    channel.postMessage(payload);
    channel.close();
  } catch {
    // Missing BroadcastChannel / closed worker — persist already wrote.
  }
}

export function listenDexieTabEvents(onEvent: (event: DexieTabEvent) => void): () => void {
  const Channel = globalThis.BroadcastChannel;
  if (typeof Channel !== "function") return () => undefined;
  try {
    const channel = new Channel(DEXIE_TAB_CHANNEL);
    const handle = (message: MessageEvent) => {
      const parsed = parseDexieTabEvent(message.data);
      if (parsed) onEvent(parsed);
    };
    channel.addEventListener("message", handle);
    return () => {
      channel.removeEventListener("message", handle);
      channel.close();
    };
  } catch {
    return () => undefined;
  }
}
