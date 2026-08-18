import { afterEach, expect, test } from "vitest";
import { allowPinAttempt, resetPinAttempts } from "./login-throttle";

afterEach(() => {
  resetPinAttempts();
});

test("allows five PIN attempts then blocks the sixth in the same window", () => {
  const now = 1_000_000;
  for (let i = 0; i < 5; i += 1) {
    expect(allowPinAttempt("staff-1", now + i)).toBe(true);
  }
  expect(allowPinAttempt("staff-1", now + 5)).toBe(false);
  expect(allowPinAttempt("staff-2", now + 5)).toBe(true);
});

test("expired attempts fall out of the window", () => {
  const now = 1_000_000;
  for (let i = 0; i < 5; i += 1) {
    expect(allowPinAttempt("staff-1", now)).toBe(true);
  }
  expect(allowPinAttempt("staff-1", now + 60_000)).toBe(true);
});
