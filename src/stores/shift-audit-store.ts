import { create } from "zustand";
import type { AuditEntry, Shift } from "../../packages/pos-core/src/types";

// ---------------------------------------------------------------------------
// Guard helpers
// ---------------------------------------------------------------------------
const isNonemptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

const isSafeNonNeg = (v: unknown): v is number =>
  Number.isSafeInteger(v) && (v as number) >= 0;

const safeOriginalGraph = (value: unknown, seen = new WeakSet<object>()): boolean => {
  if (value === null || value === undefined) return true;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return true;
  if (typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) return false;
  if (seen.has(value)) return false;
  seen.add(value);
  try {
    for (const key of Reflect.ownKeys(value)) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !safeOriginalGraph(descriptor.value, seen)) return false;
    }
    structuredClone(value);
    return true;
  } catch {
    return false;
  } finally {
    seen.delete(value);
  }
};

/**
 * Returns a shallow data-property record from value, or null if:
 *  - value is not a plain object (non-null object, prototype === Object.prototype)
 *  - value is an array
 *  - value is a Proxy (structuredClone throws on Proxy in this environment)
 *  - any own property at top level is an accessor (getter/setter)
 *
 * Does NOT recurse into nested values.
 */
const materializeRecord = (value: unknown): Record<string, unknown> | null => {
  try {
    if (
      value === null ||
      typeof value !== "object" ||
      Array.isArray(value) ||
      Object.getPrototypeOf(value) !== Object.prototype
    )
      return null;

    if (!safeOriginalGraph(value)) return null;

    const descriptors = Object.getOwnPropertyDescriptors(
      value as Record<string, unknown>,
    );
    const keys = Reflect.ownKeys(descriptors) as string[];

    // Reject any accessor (getter/setter) at top level
    if (keys.some((k) => !("value" in descriptors[k]))) return null;

    const result: Record<string, unknown> = {};
    for (const k of keys) {
      result[k] = (value as Record<string, unknown>)[k];
    }
    return result;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Shift validation / canonicalisation
// ---------------------------------------------------------------------------
const canonicalShift = (raw: Record<string, unknown>): Shift | null => {
  if (
    !isNonemptyString(raw.id) ||
    !isNonemptyString(raw.tenantId) ||
    !isNonemptyString(raw.staffId) ||
    !isSafeNonNeg(raw.openedAt) ||
    !isSafeNonNeg(raw.openingCash)
  )
    return null;

  // Must NOT already be closed
  if (Object.hasOwn(raw, "closedAt")) return null;
  if (Object.hasOwn(raw, "closingCash")) return null;

  // Optional note
  if (Object.hasOwn(raw, "note") && typeof raw.note !== "string") return null;

  const shift: Shift = {
    id: raw.id,
    tenantId: raw.tenantId,
    staffId: raw.staffId,
    openedAt: raw.openedAt,
    openingCash: raw.openingCash,
  };
  if (typeof raw.note === "string") shift.note = raw.note;
  return shift;
};

// ---------------------------------------------------------------------------
// AuditEntry validation / canonicalisation
// ---------------------------------------------------------------------------

/**
 * Recursively scan all own properties in a plain-object graph and reject if
 * any node has an accessor descriptor (getter/setter). Returns false if any
 * node is not a plain object or has an accessor.
 */
const hasNoAccessorInGraph = (
  obj: unknown,
  visited: Set<object>,
): boolean => {
  if (obj === null || typeof obj !== "object") return true; // primitive — fine
  if (Array.isArray(obj)) {
    // Scan array elements
    for (const item of obj as unknown[]) {
      if (!hasNoAccessorInGraph(item, visited)) return false;
    }
    return true;
  }
  if (Object.getPrototypeOf(obj) !== Object.prototype) return false; // non-plain
  if (visited.has(obj)) return true; // cycle — detected separately by JSON.stringify
  visited.add(obj);
  const descriptors = Object.getOwnPropertyDescriptors(obj as Record<string, unknown>);
  for (const k of Reflect.ownKeys(descriptors) as string[]) {
    if (!("value" in descriptors[k])) return false; // accessor found
    if (!hasNoAccessorInGraph(descriptors[k].value, visited)) return false;
  }
  return true;
};

/**
 * Validates and deep-clones the `details` field.
 * Rejects: non-plain-object, accessor properties anywhere in graph, cyclic references.
 */
const cloneDetails = (
  details: unknown,
): Record<string, unknown> | null => {
  if (
    details === null ||
    typeof details !== "object" ||
    Array.isArray(details) ||
    Object.getPrototypeOf(details) !== Object.prototype
  )
    return null;

  // Reject accessor properties anywhere in the graph
  if (!hasNoAccessorInGraph(details, new Set())) return null;

  // Reject cyclic references (JSON.stringify throws on cycles)
  try {
    JSON.stringify(details);
  } catch {
    return null;
  }

  // Safe to structuredClone now
  return structuredClone(details) as Record<string, unknown>;
};

const canonicalAudit = (raw: Record<string, unknown>): AuditEntry | null => {
  if (
    !isNonemptyString(raw.id) ||
    !isNonemptyString(raw.tenantId) ||
    !isNonemptyString(raw.staffId) ||
    !isNonemptyString(raw.action) ||
    !isNonemptyString(raw.entityType) ||
    !isNonemptyString(raw.entityId) ||
    !isSafeNonNeg(raw.timestamp)
  )
    return null;

  const detailsClone = cloneDetails(raw.details);
  if (detailsClone === null) return null;

  return {
    id: raw.id,
    tenantId: raw.tenantId,
    staffId: raw.staffId,
    action: raw.action,
    entityType: raw.entityType,
    entityId: raw.entityId,
    details: detailsClone,
    timestamp: raw.timestamp,
  };
};

// ---------------------------------------------------------------------------
// State type
// ---------------------------------------------------------------------------
type ShiftAuditState = {
  currentShift: Shift | null;
  auditEntries: AuditEntry[];
  openShift: (shift: unknown) => boolean;
  closeShift: (
    closedAt: unknown,
    closingCash: unknown,
    note?: unknown,
  ) => boolean;
  appendAudit: (entry: unknown) => boolean;
  auditsForEntity: (
    entityType: unknown,
    entityId: unknown,
  ) => AuditEntry[];
  clear: () => void;
};

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useShiftAuditStore = create<ShiftAuditState>()((set, get) => ({
  currentShift: null,
  auditEntries: [],

  // -------------------------------------------------------------------------
  // openShift
  // -------------------------------------------------------------------------
  openShift(shiftInput: unknown): boolean {
    const raw = materializeRecord(shiftInput);
    if (!raw) return false;

    const shift = canonicalShift(raw);
    if (!shift) return false;

    const { currentShift } = get();
    // Reject if current shift is open (no closedAt on stored shift)
    if (currentShift !== null && currentShift.closedAt === undefined)
      return false;

    set({ currentShift: shift });
    return true;
  },

  // -------------------------------------------------------------------------
  // closeShift
  // -------------------------------------------------------------------------
  closeShift(closedAt: unknown, closingCash: unknown, note?: unknown): boolean {
    const { currentShift } = get();
    // Must have an open shift
    if (!currentShift || currentShift.closedAt !== undefined) return false;

    // Validate closedAt
    if (!isSafeNonNeg(closedAt)) return false;
    if ((closedAt as number) < currentShift.openedAt) return false;

    // Validate closingCash
    if (!isSafeNonNeg(closingCash)) return false;

    // Validate note: if provided must be string; undefined = keep existing
    if (note !== undefined && typeof note !== "string") return false;

    const closed: Shift = {
      id: currentShift.id,
      tenantId: currentShift.tenantId,
      staffId: currentShift.staffId,
      openedAt: currentShift.openedAt,
      openingCash: currentShift.openingCash,
      closedAt: closedAt as number,
      closingCash: closingCash as number,
    };
    // Note: supplied note replaces; omitted keeps existing
    const resolvedNote =
      note !== undefined ? (note as string) : currentShift.note;
    if (resolvedNote !== undefined) closed.note = resolvedNote;

    set({ currentShift: closed });
    return true;
  },

  // -------------------------------------------------------------------------
  // appendAudit
  // -------------------------------------------------------------------------
  appendAudit(entryInput: unknown): boolean {
    const raw = materializeRecord(entryInput);
    if (!raw) return false;

    const entry = canonicalAudit(raw);
    if (!entry) return false;

    const { auditEntries } = get();
    if (auditEntries.some((e) => e.id === entry.id)) return false;

    set({ auditEntries: [...auditEntries, entry] });
    return true;
  },

  // -------------------------------------------------------------------------
  // auditsForEntity
  // -------------------------------------------------------------------------
  auditsForEntity(entityType: unknown, entityId: unknown): AuditEntry[] {
    if (!isNonemptyString(entityType) || !isNonemptyString(entityId)) return [];
    const { auditEntries } = get();
    return auditEntries
      .filter((e) => e.entityType === entityType && e.entityId === entityId)
      .map((e) => ({
        ...e,
        details: structuredClone(e.details) as Record<string, unknown>,
      }));
  },

  // -------------------------------------------------------------------------
  // clear
  // -------------------------------------------------------------------------
  clear(): void {
    set({ currentShift: null, auditEntries: [] });
  },
}));
