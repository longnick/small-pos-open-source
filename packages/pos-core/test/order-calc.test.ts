import { expect, test } from "vitest";
import {
  computeChange,
  computeDiscount,
  computeSubtotal,
  computeTotal,
} from "../src/order-calc";

test("computes empty, cancelled, and multi-item subtotals", () => {
  expect(computeSubtotal([])).toBe(0);
  expect(computeSubtotal([{ price: 200, quantity: 2, cancelledAt: 0 }])).toBe(0);
  expect(
    computeSubtotal([
      { price: 200, quantity: 2 },
      { price: 150, quantity: 3 },
      { price: 99, quantity: 1, cancelledAt: 1 },
    ]),
  ).toBe(850);
});

test("computes amount and percent discounts", () => {
  expect(computeDiscount(1_000, "amount", 250)).toBe(250);
  expect(computeDiscount(1_999, "percent", 15)).toBe(299);
  expect(computeDiscount(1_000, "amount", 5_000)).toBe(1_000);
  expect(computeDiscount(1_000, "percent", 100)).toBe(1_000);
  expect(computeDiscount(0, "amount", 0)).toBe(0);
});

test("computes nonnegative total and change", () => {
  expect(computeTotal(1_000, 250)).toBe(750);
  expect(computeTotal(1_000, 5_000)).toBe(0);
  expect(computeChange(1_000, 750)).toBe(250);
  expect(computeChange(500, 750)).toBe(0);
});

test("rejects invalid values before calculation", () => {
  for (const value of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() => computeDiscount(value, "amount", 0)).toThrow();
    expect(() => computeDiscount(0, "amount", value)).toThrow();
    expect(() => computeSubtotal([{ price: value, quantity: 1 }])).toThrow();
  }

  for (const quantity of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    expect(() => computeSubtotal([{ price: 1, quantity }])).toThrow();
  }

  expect(() => computeDiscount(100, "percent", 101)).toThrow(RangeError);
  expect(() => computeDiscount(100, "percent", 1.5)).toThrow(TypeError);
  expect(() => computeTotal(100, -1)).toThrow(RangeError);
  expect(() => computeChange(-1, 0)).toThrow(RangeError);
});

test("rejects multiplication and summation overflow", () => {
  expect(() => computeSubtotal([{ price: Number.MAX_SAFE_INTEGER, quantity: 2 }])).toThrow(
    RangeError,
  );
  expect(() =>
    computeSubtotal([
      { price: Number.MAX_SAFE_INTEGER, quantity: 1 },
      { price: 1, quantity: 1 },
    ]),
  ).toThrow(RangeError);
});

test("does not mutate items", () => {
  const items = [{ price: 200, quantity: 2 }];
  const snapshot = structuredClone(items);

  expect(computeSubtotal(items)).toBe(400);
  expect(items).toEqual(snapshot);
});
