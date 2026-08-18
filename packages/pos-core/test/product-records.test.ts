import { expect, test } from "vitest";
import { isValidPinHash } from "../src/product-records";

test("accepts exact v1 16-byte salt and 32-byte key", () => {
  expect(isValidPinHash("v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")).toBe(true);
});

test("rejects v1$ prefix-only and wrong decoded lengths", () => {
  expect(isValidPinHash("v1$")).toBe(false);
  expect(isValidPinHash("v1$AA==$AA==")).toBe(false);
  expect(isValidPinHash("v2$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=")).toBe(false);
});
