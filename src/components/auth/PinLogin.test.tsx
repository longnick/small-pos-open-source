/**
 * Tests for PinLoginScreen component.
 * Slices 3–6: gate states, form behaviour, busy/error, session boundary.
 */
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { bootstrapDemoAuth } from "../../auth/demo-auth-adapter";

// We test PinLoginScreen in isolation; App.tsx wiring is verified via E2E.

// --- Slice 3: gate states contain no POS shell DOM ---

describe("PinLoginScreen – Slice 3: boot states", () => {
  it("renders loading state (status role) without POS shell header", async () => {
    const { PinLoginScreen } = await import("./PinLogin");
    const { container } = render(
      <PinLoginScreen state="loading" staff={[]} onSignIn={async () => false} />,
    );
    expect(container.querySelector("header")).toBeNull();
    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("renders fatal error state (alert role) without POS shell header", async () => {
    const { PinLoginScreen } = await import("./PinLogin");
    const { container } = render(
      <PinLoginScreen state="fatal" staff={[]} onSignIn={async () => false} />,
    );
    expect(container.querySelector("header")).toBeNull();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toMatch(/Không thể khởi tạo đăng nhập/i);
  });

  it("renders login form (heading) without POS shell header", async () => {
    const { PinLoginScreen } = await import("./PinLogin");
    const { staff } = await bootstrapDemoAuth();
    const { container } = render(
      <PinLoginScreen state="ready" staff={staff} onSignIn={async () => false} />,
    );
    expect(container.querySelector("header")).toBeNull();
    expect(screen.getByRole("heading")).toBeTruthy();
  });
});

// --- Slice 4: staff select + PIN validation + native form behaviour ---

describe("PinLoginScreen – Slice 4: form behaviour", () => {
  async function setup() {
    const { PinLoginScreen } = await import("./PinLogin");
    const { staff } = await bootstrapDemoAuth();
    const onSignIn = vi.fn().mockResolvedValue(false) as (staffId: string, pin: string) => Promise<boolean>;
    render(<PinLoginScreen state="ready" staff={staff} onSignIn={onSignIn} />);
    return { staff, onSignIn };
  }

  it("renders staff combobox and PIN field", async () => {
    await setup();
    expect(screen.getByRole("combobox")).toBeTruthy();
    expect(screen.getByLabelText(/PIN/i)).toBeTruthy();
  });

  it("submit disabled until staff selected and 4-digit PIN entered", async () => {
    const { staff } = await setup();
    const btn = screen.getByRole("button", { name: /đăng nhập/i });
    expect(btn).toBeDisabled();
    // Select first staff
    fireEvent.change(screen.getByRole("combobox"), { target: { value: staff[0].id } });
    expect(btn).toBeDisabled();
    // 3 digits — still disabled
    fireEvent.change(screen.getByLabelText(/PIN/i), { target: { value: "000" } });
    expect(btn).toBeDisabled();
    // 4 digits — now enabled
    fireEvent.change(screen.getByLabelText(/PIN/i), { target: { value: "7890" } });
    expect(btn).not.toBeDisabled();
  });

  it("PIN input filters non-digit characters", async () => {
    await setup();
    const pinInput = screen.getByLabelText(/PIN/i) as HTMLInputElement;
    fireEvent.change(pinInput, { target: { value: "ab12" } });
    expect(pinInput.value).toBe("12");
  });

  it("PIN input enforces max 4 digits", async () => {
    await setup();
    const pinInput = screen.getByLabelText(/PIN/i) as HTMLInputElement;
    fireEvent.change(pinInput, { target: { value: "123456" } });
    expect(pinInput.value).toBe("1234");
  });

  it("PIN input type is password", async () => {
    await setup();
    const pinInput = screen.getByLabelText(/PIN/i) as HTMLInputElement;
    expect(pinInput.type).toBe("password");
  });

  it("PIN input has inputMode=numeric", async () => {
    await setup();
    const pinInput = screen.getByLabelText(/PIN/i) as HTMLInputElement;
    expect(pinInput.getAttribute("inputmode")).toBe("numeric");
  });

  it("PIN input has autoComplete=off", async () => {
    await setup();
    const pinInput = screen.getByLabelText(/PIN/i) as HTMLInputElement;
    expect(pinInput.getAttribute("autocomplete")).toBe("off");
  });
});

// --- Slice 5: generic failure / no-leak / busy behaviour ---

describe("PinLoginScreen – Slice 5: error and busy", () => {
  async function setupWithSignIn(signInResult: boolean | (() => Promise<boolean>)) {
    const { PinLoginScreen } = await import("./PinLogin");
    const { staff } = await bootstrapDemoAuth();
    const onSignIn = typeof signInResult === "function"
      ? vi.fn(signInResult) as (staffId: string, pin: string) => Promise<boolean>
      : vi.fn().mockResolvedValue(signInResult) as (staffId: string, pin: string) => Promise<boolean>;
    render(<PinLoginScreen state="ready" staff={staff} onSignIn={onSignIn} />);
    return { staff, onSignIn };
  }

  async function submitWith(staffId: string, pin: string) {
    fireEvent.change(screen.getByRole("combobox"), { target: { value: staffId } });
    fireEvent.change(screen.getByLabelText(/PIN/i), { target: { value: pin } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));
    });
  }

  it("shows generic error on failed sign-in", async () => {
    const { staff } = await setupWithSignIn(false);
    await submitWith(staff[0].id, "9999");
    await waitFor(() => {
      expect(screen.getByRole("alert").textContent).toMatch(/PIN không đúng. Vui lòng thử lại./i);
    });
  });

  it("error message does not contain the attempted PIN", async () => {
    const { staff } = await setupWithSignIn(false);
    await submitWith(staff[0].id, "9999");
    await waitFor(() => {
      const alertText = screen.getByRole("alert").textContent ?? "";
      expect(alertText).not.toContain("9999");
    });
  });

  it("clears PIN after failed attempt", async () => {
    const { staff } = await setupWithSignIn(false);
    await submitWith(staff[0].id, "9999");
    const pinInput = screen.getByLabelText(/PIN/i) as HTMLInputElement;
    await waitFor(() => {
      expect(pinInput.value).toBe("");
    });
  });

  it("button is disabled (busy) during sign-in call", async () => {
    let resolve!: (v: boolean) => void;
    const { staff } = await setupWithSignIn(() => new Promise<boolean>((r) => { resolve = r; }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: staff[0].id } });
    fireEvent.change(screen.getByLabelText(/PIN/i), { target: { value: "7890" } });
    const btn = screen.getByRole("button", { name: /đăng nhập/i });
    act(() => { fireEvent.click(btn); });
    await waitFor(() => expect(btn).toBeDisabled());
    await act(async () => { resolve(false); });
  });

  it("de-dupes same-tick form submits before React rerenders", async () => {
    let resolve!: (v: boolean) => void;
    const { staff, onSignIn } = await setupWithSignIn(
      () => new Promise<boolean>((r) => { resolve = r; }),
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: staff[0].id } });
    fireEvent.change(screen.getByLabelText(/PIN/i), { target: { value: "7890" } });
    const form = screen.getByRole("button", { name: /đăng nhập/i }).closest("form")!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onSignIn).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(false); });
  });

  it("de-dupes concurrent submits (onSignIn called only once)", async () => {
    let resolve!: (v: boolean) => void;
    const { staff, onSignIn } = await setupWithSignIn(
      () => new Promise<boolean>((r) => { resolve = r; }),
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: staff[0].id } });
    fireEvent.change(screen.getByLabelText(/PIN/i), { target: { value: "7890" } });
    const btn = screen.getByRole("button", { name: /đăng nhập/i });
    act(() => { fireEvent.click(btn); });
    await waitFor(() => expect(btn).toBeDisabled());
    fireEvent.click(btn); // second click should be no-op
    expect(onSignIn).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(false); });
  });
});

// --- Slice 2.5-F: tenant context persistence after staff selection ---

describe("PinLoginScreen – Slice 2.5-F: tenant context persistence", () => {
  it("keeps tenant name 'Quán Demo' visible after staff is selected", async () => {
    const { PinLoginScreen } = await import("./PinLogin");
    const { staff } = await bootstrapDemoAuth();
    render(
      <PinLoginScreen state="ready" staff={staff} tenantName="Quán Demo" onSignIn={async () => false} />,
    );

    // Tenant name is visible before selection
    expect(screen.getByText("Quán Demo")).toBeTruthy();

    // Select first staff member
    fireEvent.change(screen.getByRole("combobox"), { target: { value: staff[0].id } });

    // Tenant name must still be visible after selection
    expect(screen.getByText("Quán Demo")).toBeTruthy();
  });
});

// --- Slice 2.5-B: PIN enabled and focused after rejected sign-in ---

describe("PinLoginScreen – Slice 2.5-B: focus after rejected sign-in", () => {
  it("PIN input is enabled and focused after onSignIn resolves false", async () => {
    // Block all setTimeout calls so we can assert that focus is NOT driven by
    // a setTimeout that races with setBusy(false). With the broken code
    // (setTimeout approach), focus() is never called because the setTimeout is
    // blocked → focusCallDisabledState.length === 0 → RED.
    // With the fixed code (useEffect approach), focus fires in the React effect
    // flush inside act() without needing a setTimeout → GREEN.
    vi.useFakeTimers({ toFake: ["setTimeout"] });
    const { PinLoginScreen } = await import("./PinLogin");
    const { staff } = await bootstrapDemoAuth();

    const focusCallCount: number[] = [];
    const origFocus = HTMLInputElement.prototype.focus;
    HTMLInputElement.prototype.focus = function (this: HTMLInputElement, ...args) {
      focusCallCount.push(this.disabled ? 1 : 0);
      return origFocus.apply(this, args);
    };

    try {
      const onSignIn = vi.fn().mockResolvedValue(false) as (staffId: string, pin: string) => Promise<boolean>;
      render(<PinLoginScreen state="ready" staff={staff} onSignIn={onSignIn} />);

      const pinInput = screen.getByLabelText(/PIN/i) as HTMLInputElement;
      fireEvent.change(screen.getByRole("combobox"), { target: { value: staff[0].id } });
      fireEvent.change(pinInput, { target: { value: "9999" } });

      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));
        // Settle promise chain without advancing fake timers.
        await new Promise<void>((resolve) => {
          // Use queueMicrotask to wait for all microtasks (onSignIn + React
          // batching) without ticking fake timers.
          queueMicrotask(() => queueMicrotask(() => queueMicrotask(resolve)));
        });
      });

      // After act(): React has committed setBusy(false) and flushed effects.
      // The focus-via-useEffect (fixed code) fires here.
      // The focus-via-setTimeout (broken code) has NOT fired (timers blocked).

      // Assertion 1: input is enabled (React committed setBusy(false))
      expect(pinInput).not.toBeDisabled();

      // Assertion 2: focus was called (requires useEffect, not setTimeout)
      // RED with current source (setTimeout blocked, so focus never called).
      // GREEN with fix (useEffect fires during act() flush).
      expect(focusCallCount.length).toBeGreaterThan(0);

      // Assertion 3: focus was called while input was already enabled
      expect(focusCallCount.every((v) => v === 0)).toBe(true);
    } finally {
      HTMLInputElement.prototype.focus = origFocus;
      vi.useRealTimers();
    }
  });
});

// --- Slice 6: success and session boundary ---

describe("PinLoginScreen – Slice 6: success", () => {
  it("calls onSignIn with (staffId, pin) on submit", async () => {
    const { PinLoginScreen } = await import("./PinLogin");
    const { staff } = await bootstrapDemoAuth();
    const onSignIn = vi.fn().mockResolvedValue(true) as (staffId: string, pin: string) => Promise<boolean>;
    render(<PinLoginScreen state="ready" staff={staff} onSignIn={onSignIn} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: staff[0].id } });
    fireEvent.change(screen.getByLabelText(/PIN/i), { target: { value: "7890" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));
    });
    await waitFor(() => {
      expect(onSignIn).toHaveBeenCalledWith(staff[0].id, "7890");
    });
  });

  it("clears PIN after successful attempt", async () => {
    const { PinLoginScreen } = await import("./PinLogin");
    const { staff } = await bootstrapDemoAuth();
    const onSignIn = vi.fn().mockResolvedValue(true) as (staffId: string, pin: string) => Promise<boolean>;
    render(<PinLoginScreen state="ready" staff={staff} onSignIn={onSignIn} />);
    fireEvent.change(screen.getByRole("combobox"), { target: { value: staff[0].id } });
    const pinInput = screen.getByLabelText(/PIN/i) as HTMLInputElement;
    fireEvent.change(pinInput, { target: { value: "7890" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));
    });
    await waitFor(() => {
      expect(pinInput.value).toBe("");
    });
  });
});
