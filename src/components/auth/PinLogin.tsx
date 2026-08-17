/**
 * PIN Login screen — minimal, self-contained, accessible.
 * Uses existing project primitives: Button, Input, cn.
 * Does not restyle or import from the App shell.
 */
import React, { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { Staff } from "../../../packages/pos-core/src/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// --- Types ---

export type LoginState = "loading" | "fatal" | "ready";

export interface PinLoginScreenProps {
  state: LoginState;
  /** Staff list from demo-auth-adapter bootstrap, already stripped of raw PIN. */
  staff: Staff[];
  /** Venue label. Demo login keeps "Quán Demo" when omitted. */
  tenantName?: string;
  /** Called with (staffId, pin). Returns true on success. */
  onSignIn: (staffId: string, pin: string) => Promise<boolean>;
}

// --- Loading ---

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        role="status"
        aria-label="Đang khởi tạo"
        className="flex flex-col items-center gap-3 text-muted-foreground"
      >
        <div
          aria-hidden="true"
          className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"
        />
        <span className="text-sm">Đang khởi tạo…</span>
      </div>
    </main>
  );
}

// --- Fatal ---

function FatalScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div
        role="alert"
        className="max-w-sm rounded-xl border border-destructive bg-destructive/10 p-6 text-center text-destructive"
      >
        <p className="font-semibold">Không thể khởi tạo đăng nhập.</p>
        <p className="mt-1 text-sm text-muted-foreground">Vui lòng tải lại trang.</p>
      </div>
    </main>
  );
}

// --- Login form ---

function LoginForm({
  staff,
  tenantName = "Quán Demo",
  onSignIn,
}: {
  staff: Staff[];
  tenantName?: string;
  onSignIn: (staffId: string, pin: string) => Promise<boolean>;
}) {
  const [selectedId, setSelectedId] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [focusPin, setFocusPin] = useState(false);
  const pinRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const errorId = useId();
  const pinId = useId();
  const selectId = useId();

  // Focus the PIN input after an error is shown and busy has cleared.
  // useEffect runs after React commits the render where busy=false, so the
  // input is guaranteed to be enabled when focus() is called.
  useEffect(() => {
    if (focusPin && !busy) {
      pinRef.current?.focus();
      setFocusPin(false);
    }
  }, [focusPin, busy]);

  const canSubmit = selectedId !== "" && pin.length === 4 && !busy;

  function handlePinChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Filter non-digits, max 4
    const digits = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(digits);
    if (error) setError("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || submittingRef.current) return;
    submittingRef.current = true;
    setBusy(true);
    setError("");
    const currentPin = pin;
    const currentStaffId = selectedId;
    // Clear PIN immediately after capture — raw PIN never lingers in state
    setPin("");
    try {
      const ok = await onSignIn(currentStaffId, currentPin);
      if (!ok) {
        setError("PIN không đúng. Vui lòng thử lại.");
        setFocusPin(true);
      }
    } catch {
      setError("PIN không đúng. Vui lòng thử lại.");
      setFocusPin(true);
    } finally {
      submittingRef.current = false;
      setBusy(false);
    }
  }

  const selectedStaff = staff.find((s) => s.id === selectedId);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          {/* Heading */}
          <h1
            className="mb-1 text-center text-xl font-bold text-card-foreground sm:text-2xl"
          >
            Đăng nhập
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            {tenantName}
          </p>

          <form
            onSubmit={handleSubmit}
            noValidate
            aria-busy={busy}
          >
            {/* Staff select */}
            <div className="mb-4">
              <label
                htmlFor={selectId}
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                Nhân viên
              </label>
              <select
                id={selectId}
                value={selectedId}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setError("");
                }}
                disabled={busy}
                aria-label="Chọn nhân viên"
                className={cn(
                  "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-base shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                <option value="">-- Chọn nhân viên --</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* PIN */}
            <div className="mb-6">
              <label
                htmlFor={pinId}
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                PIN
              </label>
              <Input
                ref={pinRef}
                id={pinId}
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={handlePinChange}
                disabled={busy}
                aria-invalid={error !== ""}
                aria-describedby={error ? errorId : undefined}
                placeholder="••••"
                className="h-11 text-center text-lg tracking-widest"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                id={errorId}
                role="alert"
                aria-live="assertive"
                className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={!canSubmit}
              aria-busy={busy}
              className="h-11 w-full text-base font-semibold"
            >
              {busy ? "Đang đăng nhập…" : "Đăng nhập"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}

// --- Exported screen ---

export function PinLoginScreen({ state, staff, tenantName, onSignIn }: PinLoginScreenProps) {
  if (state === "loading") return <LoadingScreen />;
  if (state === "fatal") return <FatalScreen />;
  return <LoginForm staff={staff} tenantName={tenantName} onSignIn={onSignIn} />;
}
