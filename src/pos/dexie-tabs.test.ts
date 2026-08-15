import { afterEach, expect, test, vi } from "vitest";
import { DEXIE_TAB_CHANNEL, listenDexieTabEvents, notifyDexieTabWrite } from "./dexie-tabs";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("notifyDexieTabWrite posts only a tenant-scoped persist event", () => {
  const posted: unknown[] = [];
  class FakeChannel {
    name: string;
    constructor(name: string) {
      this.name = name;
    }
    postMessage(data: unknown) {
      posted.push(data);
    }
    close() {}
  }
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  notifyDexieTabWrite({ tenantId: "tenant-demo", kind: "occupy" });
  expect(posted).toEqual([{ tenantId: "tenant-demo", kind: "occupy" }]);
});

test("listenDexieTabEvents delivers valid events and drops malformed payloads", () => {
  const handlers: Array<(event: MessageEvent) => void> = [];
  class FakeChannel {
    name: string;
    constructor(name: string) {
      this.name = name;
      expect(name).toBe(DEXIE_TAB_CHANNEL);
    }
    addEventListener(type: string, handler: (event: MessageEvent) => void) {
      if (type === "message") handlers.push(handler);
    }
    removeEventListener() {}
    close() {}
  }
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  const seen: Array<{ tenantId: string; kind: string }> = [];
  const stop = listenDexieTabEvents((event) => {
    seen.push(event);
  });
  const deliver = (data: unknown) => {
    for (const handler of handlers) handler({ data } as MessageEvent);
  };
  deliver({ tenantId: "tenant-demo", kind: "pay" });
  deliver({ tenantId: "other", kind: "pay" });
  deliver({ tenantId: "tenant-demo" });
  deliver("nope");
  deliver(null);
  expect(seen).toEqual([
    { tenantId: "tenant-demo", kind: "pay" },
    { tenantId: "other", kind: "pay" },
  ]);
  stop();
});

test("listenDexieTabEvents is a no-op when BroadcastChannel is missing", () => {
  vi.stubGlobal("BroadcastChannel", undefined);
  const stop = listenDexieTabEvents(() => {
    throw new Error("should not fire");
  });
  expect(() => stop()).not.toThrow();
});
