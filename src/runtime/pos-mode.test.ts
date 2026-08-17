import { describe, expect, test } from "vitest";
import { loginVenueName, resolvePosMode, shouldBootstrapDemoAuth } from "./pos-mode";

describe("resolvePosMode", () => {
  test("defaults to demo when env is missing", () => {
    expect(resolvePosMode(undefined)).toBe("demo");
  });

  test("defaults to demo when env is empty", () => {
    expect(resolvePosMode("")).toBe("demo");
    expect(resolvePosMode("   ")).toBe("demo");
  });

  test("accepts demo and production-local", () => {
    expect(resolvePosMode("demo")).toBe("demo");
    expect(resolvePosMode("production-local")).toBe("production-local");
  });

  test("unknown or hostile values fail closed to demo", () => {
    expect(resolvePosMode("prod")).toBe("demo");
    expect(resolvePosMode("DEMO")).toBe("demo");
    expect(resolvePosMode("production-local\n")).toBe("demo");
    expect(resolvePosMode(" production-local ")).toBe("demo");
  });
});

describe("shouldBootstrapDemoAuth", () => {
  test("demo bootstraps demo staff; production-local does not", () => {
    expect(shouldBootstrapDemoAuth("demo")).toBe(true);
    expect(shouldBootstrapDemoAuth("production-local")).toBe(false);
  });
});

describe("loginVenueName", () => {
  test("demo falls back to Quán Demo", () => {
    expect(loginVenueName("demo")).toBe("Quán Demo");
    expect(loginVenueName("demo", "  ")).toBe("Quán Demo");
  });

  test("production-local falls back to Chưa thiết lập quán", () => {
    expect(loginVenueName("production-local")).toBe("Chưa thiết lập quán");
  });

  test("explicit tenant name wins in both modes", () => {
    expect(loginVenueName("demo", " Quán Nhà ")).toBe("Quán Nhà");
    expect(loginVenueName("production-local", " Quán Nhà ")).toBe("Quán Nhà");
  });
});
