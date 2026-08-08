/**
 * shift-audit-store.test.ts
 * Strict TDD — slices appended incrementally.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useShiftAuditStore } from "./shift-audit-store";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
const validShift = () => ({
  id: "s1",
  tenantId: "t1",
  staffId: "u1",
  openedAt: 1000,
  openingCash: 500000,
});

// ---------------------------------------------------------------------------
// SLICE 1 — openShift
// ---------------------------------------------------------------------------
describe("ShiftAuditStore — openShift", () => {
  beforeEach(() => useShiftAuditStore.getState().clear());

  it("initial state: currentShift is null, auditEntries is empty", () => {
    const { currentShift, auditEntries } = useShiftAuditStore.getState();
    expect(currentShift).toBeNull();
    expect(auditEntries).toEqual([]);
  });

  it("valid openShift returns true and stores canonical shift", () => {
    const store = useShiftAuditStore.getState();
    const result = store.openShift(validShift());
    expect(result).toBe(true);
    const { currentShift } = useShiftAuditStore.getState();
    expect(currentShift).not.toBeNull();
    expect(currentShift!.id).toBe("s1");
    expect(currentShift!.openedAt).toBe(1000);
    expect(currentShift!.openingCash).toBe(500000);
  });

  it("openShift with note stores note", () => {
    const store = useShiftAuditStore.getState();
    store.openShift({ ...validShift(), note: "morning" });
    expect(useShiftAuditStore.getState().currentShift!.note).toBe("morning");
  });

  it("openShift does not accept shift with closedAt present", () => {
    const store = useShiftAuditStore.getState();
    const result = store.openShift({ ...validShift(), closedAt: 2000 });
    expect(result).toBe(false);
    expect(useShiftAuditStore.getState().currentShift).toBeNull();
  });

  it("openShift does not accept shift with closingCash present", () => {
    const store = useShiftAuditStore.getState();
    const result = store.openShift({ ...validShift(), closingCash: 0 });
    expect(result).toBe(false);
    expect(useShiftAuditStore.getState().currentShift).toBeNull();
  });

  it("second openShift while one is already open returns false", () => {
    const store = useShiftAuditStore.getState();
    store.openShift(validShift());
    const result = useShiftAuditStore.getState().openShift({ ...validShift(), id: "s2" });
    expect(result).toBe(false);
    expect(useShiftAuditStore.getState().currentShift!.id).toBe("s1");
  });

  it("closed shift may be replaced by a new valid open shift", () => {
    // open then close then open again
    useShiftAuditStore.getState().openShift(validShift());
    // Manually update state to simulate closed shift (we'll close properly in slice 2,
    // but we can test the replace rule by calling clear then open)
    useShiftAuditStore.getState().clear();
    const result = useShiftAuditStore.getState().openShift({ ...validShift(), id: "s2" });
    expect(result).toBe(true);
    expect(useShiftAuditStore.getState().currentShift!.id).toBe("s2");
  });

  it("caller mutation after openShift does not change stored shift", () => {
    const input = validShift() as Record<string, unknown>;
    useShiftAuditStore.getState().openShift(input);
    input["openingCash"] = 0;
    input["id"] = "mutated";
    const stored = useShiftAuditStore.getState().currentShift!;
    expect(stored.openingCash).toBe(500000);
    expect(stored.id).toBe("s1");
  });

  it("openShift rejects non-object (string)", () => {
    expect(useShiftAuditStore.getState().openShift("not-an-object")).toBe(false);
  });

  it("openShift rejects null", () => {
    expect(useShiftAuditStore.getState().openShift(null)).toBe(false);
  });

  it("openShift rejects array", () => {
    expect(useShiftAuditStore.getState().openShift([validShift()])).toBe(false);
  });

  it("openShift rejects blank id", () => {
    const result = useShiftAuditStore.getState().openShift({ ...validShift(), id: "  " });
    expect(result).toBe(false);
  });

  it("openShift rejects negative openingCash", () => {
    const result = useShiftAuditStore.getState().openShift({ ...validShift(), openingCash: -1 });
    expect(result).toBe(false);
  });

  it("openShift rejects non-safe-integer openedAt", () => {
    const result = useShiftAuditStore.getState().openShift({ ...validShift(), openedAt: 1.5 });
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SLICE 2 — closeShift
// ---------------------------------------------------------------------------
describe("ShiftAuditStore — closeShift", () => {
  beforeEach(() => useShiftAuditStore.getState().clear());

  const openValid = () => useShiftAuditStore.getState().openShift(validShift());

  it("valid close returns true and shift has closedAt + closingCash", () => {
    openValid();
    const result = useShiftAuditStore.getState().closeShift(2000, 600000);
    expect(result).toBe(true);
    const s = useShiftAuditStore.getState().currentShift!;
    expect(s.closedAt).toBe(2000);
    expect(s.closingCash).toBe(600000);
  });

  it("closedAt equal to openedAt is accepted (edge: same-ms)", () => {
    openValid();
    const result = useShiftAuditStore.getState().closeShift(1000, 0);
    expect(result).toBe(true);
  });

  it("closedAt before openedAt is rejected, state preserved", () => {
    openValid();
    const result = useShiftAuditStore.getState().closeShift(999, 500000);
    expect(result).toBe(false);
    expect(useShiftAuditStore.getState().currentShift!.closedAt).toBeUndefined();
  });

  it("closedAt non-safe-integer rejected", () => {
    openValid();
    expect(useShiftAuditStore.getState().closeShift(1.5, 0)).toBe(false);
  });

  it("closedAt negative rejected", () => {
    openValid();
    expect(useShiftAuditStore.getState().closeShift(-1, 0)).toBe(false);
  });

  it("closingCash negative rejected", () => {
    openValid();
    expect(useShiftAuditStore.getState().closeShift(2000, -1)).toBe(false);
    expect(useShiftAuditStore.getState().currentShift!.closedAt).toBeUndefined();
  });

  it("closingCash non-safe-integer rejected", () => {
    openValid();
    expect(useShiftAuditStore.getState().closeShift(2000, 1.5)).toBe(false);
  });

  it("omitted note preserves existing note on shift", () => {
    useShiftAuditStore.getState().openShift({ ...validShift(), note: "start" });
    useShiftAuditStore.getState().closeShift(2000, 0);
    expect(useShiftAuditStore.getState().currentShift!.note).toBe("start");
  });

  it("supplied note replaces existing note", () => {
    useShiftAuditStore.getState().openShift({ ...validShift(), note: "start" });
    useShiftAuditStore.getState().closeShift(2000, 0, "end");
    expect(useShiftAuditStore.getState().currentShift!.note).toBe("end");
  });

  it("supplied non-string note is rejected", () => {
    openValid();
    expect(useShiftAuditStore.getState().closeShift(2000, 0, 42)).toBe(false);
  });

  it("repeated close rejected", () => {
    openValid();
    useShiftAuditStore.getState().closeShift(2000, 0);
    const result = useShiftAuditStore.getState().closeShift(3000, 0);
    expect(result).toBe(false);
    expect(useShiftAuditStore.getState().currentShift!.closedAt).toBe(2000);
  });

  it("close with no open shift returns false", () => {
    expect(useShiftAuditStore.getState().closeShift(2000, 0)).toBe(false);
  });

  it("next valid shift accepted after close", () => {
    openValid();
    useShiftAuditStore.getState().closeShift(2000, 0);
    const result = useShiftAuditStore.getState().openShift({ ...validShift(), id: "s2", openedAt: 3000 });
    expect(result).toBe(true);
    expect(useShiftAuditStore.getState().currentShift!.id).toBe("s2");
  });
});

// ---------------------------------------------------------------------------
// SLICE 3 — appendAudit / auditsForEntity
// ---------------------------------------------------------------------------
const validEntry = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "a1",
  tenantId: "t1",
  staffId: "u1",
  action: "order.cancel_item",
  entityType: "order",
  entityId: "o1",
  details: { reason: "mistake" },
  timestamp: 5000,
  ...overrides,
});

describe("ShiftAuditStore — appendAudit / auditsForEntity", () => {
  beforeEach(() => useShiftAuditStore.getState().clear());

  it("valid appendAudit returns true and entry is stored", () => {
    const result = useShiftAuditStore.getState().appendAudit(validEntry());
    expect(result).toBe(true);
    expect(useShiftAuditStore.getState().auditEntries).toHaveLength(1);
  });

  it("stored entry matches canonical fields", () => {
    useShiftAuditStore.getState().appendAudit(validEntry());
    const e = useShiftAuditStore.getState().auditEntries[0];
    expect(e.id).toBe("a1");
    expect(e.action).toBe("order.cancel_item");
    expect(e.entityType).toBe("order");
    expect(e.entityId).toBe("o1");
    expect(e.timestamp).toBe(5000);
  });

  it("auditsForEntity returns matching entries in insertion order", () => {
    useShiftAuditStore.getState().appendAudit(validEntry({ id: "a1", entityType: "order", entityId: "o1" }));
    useShiftAuditStore.getState().appendAudit(validEntry({ id: "a2", entityType: "order", entityId: "o2" }));
    useShiftAuditStore.getState().appendAudit(validEntry({ id: "a3", entityType: "order", entityId: "o1" }));
    const res = useShiftAuditStore.getState().auditsForEntity("order", "o1");
    expect(res).toHaveLength(2);
    expect(res[0].id).toBe("a1");
    expect(res[1].id).toBe("a3");
  });

  it("duplicate id rejected, state unchanged", () => {
    useShiftAuditStore.getState().appendAudit(validEntry());
    const result = useShiftAuditStore.getState().appendAudit(validEntry());
    expect(result).toBe(false);
    expect(useShiftAuditStore.getState().auditEntries).toHaveLength(1);
  });

  it("valid audit appended with no current shift (audit not coupled to shift)", () => {
    expect(useShiftAuditStore.getState().currentShift).toBeNull();
    const result = useShiftAuditStore.getState().appendAudit(validEntry());
    expect(result).toBe(true);
  });

  it("independent audit tenantId/staffId preserved (not overridden by shift)", () => {
    useShiftAuditStore.getState().openShift(validShift()); // tenantId t1, staffId u1
    useShiftAuditStore.getState().appendAudit(
      validEntry({ tenantId: "t2", staffId: "u9" }),
    );
    const e = useShiftAuditStore.getState().auditEntries[0];
    expect(e.tenantId).toBe("t2");
    expect(e.staffId).toBe("u9");
  });

  it("multiple entries preserved in insertion order", () => {
    useShiftAuditStore.getState().appendAudit(validEntry({ id: "a1" }));
    useShiftAuditStore.getState().appendAudit(validEntry({ id: "a2" }));
    useShiftAuditStore.getState().appendAudit(validEntry({ id: "a3" }));
    const ids = useShiftAuditStore.getState().auditEntries.map((e) => e.id);
    expect(ids).toEqual(["a1", "a2", "a3"]);
  });

  it("auditsForEntity with empty/bad params returns []", () => {
    useShiftAuditStore.getState().appendAudit(validEntry());
    expect(useShiftAuditStore.getState().auditsForEntity("", "o1")).toEqual([]);
    expect(useShiftAuditStore.getState().auditsForEntity("order", "")).toEqual([]);
    expect(useShiftAuditStore.getState().auditsForEntity(null, "o1")).toEqual([]);
    expect(useShiftAuditStore.getState().auditsForEntity("order", null)).toEqual([]);
  });

  it("appendAudit rejects missing required string fields", () => {
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ id: "" }))).toBe(false);
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ action: "  " }))).toBe(false);
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ entityType: 42 }))).toBe(false);
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ entityId: null }))).toBe(false);
  });

  it("appendAudit rejects invalid timestamp", () => {
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ timestamp: -1 }))).toBe(false);
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ timestamp: 1.5 }))).toBe(false);
  });

  it("appendAudit rejects non-plain details object", () => {
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ details: "string" }))).toBe(false);
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ details: [1, 2] }))).toBe(false);
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ details: null }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SLICE 4 — trust / ownership boundary
// ---------------------------------------------------------------------------
describe("ShiftAuditStore — trust and ownership boundary", () => {
  beforeEach(() => useShiftAuditStore.getState().clear());

  // --- openShift: hostile inputs ---
  it("openShift rejects class instance (non-plain object)", () => {
    class Hostile { id = "s1"; tenantId = "t1"; staffId = "u1"; openedAt = 1000; openingCash = 0; }
    expect(useShiftAuditStore.getState().openShift(new Hostile())).toBe(false);
  });

  it("openShift rejects transparent Proxy wrapping valid object", () => {
    const target = { id: "s1", tenantId: "t1", staffId: "u1", openedAt: 1000, openingCash: 0 };
    const proxy = new Proxy(target, {});
    expect(useShiftAuditStore.getState().openShift(proxy)).toBe(false);
  });

  it("openShift rejects object with getter accessor", () => {
    const hostile: Record<string, unknown> = {};
    Object.defineProperty(hostile, "id", { get: () => "s1", enumerable: true, configurable: true });
    hostile.tenantId = "t1"; hostile.staffId = "u1"; hostile.openedAt = 1000; hostile.openingCash = 0;
    expect(useShiftAuditStore.getState().openShift(hostile)).toBe(false);
  });

  it("openShift rejects object with unknown extra field types (unsafe number)", () => {
    expect(useShiftAuditStore.getState().openShift({
      id: "s1", tenantId: "t1", staffId: "u1",
      openedAt: Number.MAX_SAFE_INTEGER + 1,
      openingCash: 0,
    })).toBe(false);
  });

  it("openShift rejects object with negative openingCash", () => {
    expect(useShiftAuditStore.getState().openShift({
      id: "s1", tenantId: "t1", staffId: "u1", openedAt: 1000, openingCash: -500,
    })).toBe(false);
  });

  // --- appendAudit: hostile inputs ---
  it("appendAudit rejects class instance", () => {
    class FakeEntry {
      id = "a1"; tenantId = "t1"; staffId = "u1"; action = "x"; entityType = "order";
      entityId = "o1"; details = {}; timestamp = 1000;
    }
    expect(useShiftAuditStore.getState().appendAudit(new FakeEntry())).toBe(false);
  });

  it("appendAudit rejects transparent Proxy", () => {
    const target = validEntry();
    const proxy = new Proxy(target, {});
    expect(useShiftAuditStore.getState().appendAudit(proxy)).toBe(false);
  });

  it("appendAudit rejects unknown nested accessor without invoking getter", () => {
    let reads = 0;
    const entry = {
      ...validEntry(),
      extra: {
        get hidden() {
          reads += 1;
          return "must-not-run";
        },
      },
    };
    expect(useShiftAuditStore.getState().appendAudit(entry)).toBe(false);
    expect(reads).toBe(0);
    expect(useShiftAuditStore.getState().auditEntries).toHaveLength(0);
  });

  it("appendAudit rejects object with getter on id", () => {
    const hostile: Record<string, unknown> = {};
    Object.defineProperty(hostile, "id", { get: () => "a1", enumerable: true, configurable: true });
    Object.assign(hostile, { tenantId: "t1", staffId: "u1", action: "x", entityType: "order", entityId: "o1", details: {}, timestamp: 1000 });
    expect(useShiftAuditStore.getState().appendAudit(hostile)).toBe(false);
  });

  it("appendAudit rejects details with accessor getter", () => {
    const badDetails: Record<string, unknown> = {};
    Object.defineProperty(badDetails, "key", { get: () => "val", enumerable: true, configurable: true });
    // details itself is a plain object with getter child; structuredClone should fail
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ details: badDetails }))).toBe(false);
  });

  it("appendAudit rejects cyclic details (structuredClone would throw)", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic["self"] = cyclic;
    expect(useShiftAuditStore.getState().appendAudit(validEntry({ details: cyclic }))).toBe(false);
  });

  it("appendAudit rejects unsafe timestamp", () => {
    expect(useShiftAuditStore.getState().appendAudit(
      validEntry({ timestamp: Number.MAX_SAFE_INTEGER + 1 }),
    )).toBe(false);
  });

  // --- ownership: caller mutation after appendAudit ---
  it("caller mutation of input after appendAudit does not affect stored entry", () => {
    const input = validEntry() as Record<string, unknown>;
    useShiftAuditStore.getState().appendAudit(input);
    (input as Record<string, unknown>)["id"] = "mutated";
    (input["details"] as Record<string, unknown>)["injected"] = true;
    const stored = useShiftAuditStore.getState().auditEntries[0];
    expect(stored.id).toBe("a1");
    expect(stored.details).not.toHaveProperty("injected");
  });

  // --- ownership: mutation of lookup result ---
  it("mutation of auditsForEntity result does not affect stored entries", () => {
    useShiftAuditStore.getState().appendAudit(validEntry());
    const results = useShiftAuditStore.getState().auditsForEntity("order", "o1");
    results[0].details["injected"] = true;
    results[0].action = "mutated";
    const stored = useShiftAuditStore.getState().auditEntries[0];
    expect(stored.details).not.toHaveProperty("injected");
    expect(stored.action).toBe("order.cancel_item");
  });

  // --- clear resets both fields ---
  it("clear resets currentShift and auditEntries", () => {
    useShiftAuditStore.getState().openShift({ id: "s1", tenantId: "t1", staffId: "u1", openedAt: 1000, openingCash: 0 });
    useShiftAuditStore.getState().appendAudit(validEntry());
    useShiftAuditStore.getState().clear();
    expect(useShiftAuditStore.getState().currentShift).toBeNull();
    expect(useShiftAuditStore.getState().auditEntries).toHaveLength(0);
  });

  // --- invalid combinations preserve prior state ---
  it("failed openShift preserves existing state unchanged", () => {
    useShiftAuditStore.getState().openShift({ id: "s1", tenantId: "t1", staffId: "u1", openedAt: 1000, openingCash: 0 });
    useShiftAuditStore.getState().appendAudit(validEntry());
    useShiftAuditStore.getState().openShift(null); // should fail
    expect(useShiftAuditStore.getState().currentShift!.id).toBe("s1");
    expect(useShiftAuditStore.getState().auditEntries).toHaveLength(1);
  });

  it("failed appendAudit preserves existing audit list", () => {
    useShiftAuditStore.getState().appendAudit(validEntry({ id: "a1" }));
    useShiftAuditStore.getState().appendAudit(null); // fail
    expect(useShiftAuditStore.getState().auditEntries).toHaveLength(1);
  });

  it("failed closeShift does not alter currentShift", () => {
    useShiftAuditStore.getState().openShift({ id: "s1", tenantId: "t1", staffId: "u1", openedAt: 1000, openingCash: 500000 });
    useShiftAuditStore.getState().closeShift(999, 0); // closedAt < openedAt
    const s = useShiftAuditStore.getState().currentShift!;
    expect(s.closedAt).toBeUndefined();
    expect(s.openingCash).toBe(500000);
  });
});
