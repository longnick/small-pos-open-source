import { expect, test, vi } from "vitest";
import { canAccess, verifyPin } from "../src/auth";

test("manager permits every valid dotted action", () => {
  expect(canAccess("manager", "catalog.delete")).toBe(true);
});

test("cashier permits exact payment action", () => {
  expect(canAccess("cashier", "payment.refund")).toBe(true);
});

test("cashier permits configured order family", () => {
  expect(canAccess("cashier", "order.cancel")).toBe(true);
});

test("cashier denies unrelated family", () => {
  expect(canAccess("cashier", "catalog.edit")).toBe(false);
});

test("staff permits exact order action", () => {
  expect(canAccess("staff", "order.add_item")).toBe(true);
});

test("staff permits exact table action", () => {
  expect(canAccess("staff", "table.view")).toBe(true);
});

test("staff denies unlisted action", () => {
  expect(canAccess("staff", "order.cancel")).toBe(false);
});

test("kitchen permits sent order view", () => {
  expect(canAccess("kitchen", "order.view_sent")).toBe(true);
});

test("kitchen permits marking order done", () => {
  expect(canAccess("kitchen", "order.mark_done")).toBe(true);
});

test("kitchen denies order creation", () => {
  expect(canAccess("kitchen", "order.create")).toBe(false);
});

test("wildcards match family boundary only", () => {
  expect(canAccess("cashier", "orders.create")).toBe(false);
});

test("fails closed for malformed actions and unknown roles", () => {
  expect(canAccess("manager", "order")).toBe(false);
  expect(canAccess("manager", "order.")).toBe(false);
  expect(canAccess("manager", ".create")).toBe(false);
  expect(canAccess("manager", "order.create.extra")).toBe(false);
  expect(canAccess("owner", "order.create")).toBe(false);
  expect(canAccess("__proto__", "order.create")).toBe(false);
});

test("fails closed without throwing for Symbol action input", () => {
  expect(() => canAccess("manager", Symbol("order.create") as unknown as string)).not.toThrow();
  expect(canAccess("manager", Symbol("order.create") as unknown as string)).toBe(false);
});

test("fails closed for boxed String action input", () => {
  expect(canAccess("manager", new String("order.create") as unknown as string)).toBe(false);
});

test("verifies valid PIN with synchronous verifier", async () => {
  const verifier = vi.fn((pin: string, hash: string) => pin === "1234" && hash === "hash");

  await expect(verifyPin("1234", "hash", verifier)).resolves.toBe(true);
  expect(verifier).toHaveBeenCalledWith("1234", "hash");
});

test("verifies valid PIN with asynchronous verifier", async () => {
  await expect(verifyPin("1234", "hash", async () => true)).resolves.toBe(true);
});

test("returns false without calling verifier for invalid PIN or hash", async () => {
  const verifier = vi.fn(() => true);

  await expect(verifyPin("１２３４", "hash", verifier)).resolves.toBe(false);
  await expect(verifyPin("123", "hash", verifier)).resolves.toBe(false);
  await expect(verifyPin("1234", "", verifier)).resolves.toBe(false);
  await expect(verifyPin("1234", undefined, verifier)).resolves.toBe(false);
  expect(verifier).not.toHaveBeenCalled();
});

test("returns false without calling verifier for numeric hash input", async () => {
  const verifier = vi.fn(() => true);

  await expect(verifyPin("1234", 1234 as unknown as string, verifier)).resolves.toBe(false);
  expect(verifier).not.toHaveBeenCalled();
});

test("returns false without calling verifier for boxed hash input", async () => {
  const verifier = vi.fn(() => true);

  await expect(verifyPin("1234", new String("hash") as unknown as string, verifier)).resolves.toBe(false);
  expect(verifier).not.toHaveBeenCalled();
});

test("returns false without calling verifier for numeric PIN input", async () => {
  const verifier = vi.fn(() => true);

  await expect(verifyPin(1234 as unknown as string, "hash", verifier)).resolves.toBe(false);
  expect(verifier).not.toHaveBeenCalled();
});

test("returns false when verifier throws or rejects", async () => {
  await expect(verifyPin("1234", "hash", () => { throw new Error("no"); })).resolves.toBe(false);
  await expect(verifyPin("1234", "hash", async () => { throw new Error("no"); })).resolves.toBe(false);
});

test("returns false for missing verifier", async () => {
  await expect(verifyPin("1234", "hash")).resolves.toBe(false);
});
