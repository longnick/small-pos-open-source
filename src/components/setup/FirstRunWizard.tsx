import React, { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { FirstRunInput } from "@/pos/product-setup";

export type FirstRunWizardProps = {
  onComplete: (input: FirstRunInput) => Promise<boolean>;
};

export function FirstRunWizard({ onComplete }: FirstRunWizardProps) {
  const [shopName, setShopName] = useState("");
  const [tableCount, setTableCount] = useState("4");
  const [managerName, setManagerName] = useState("");
  const [pin, setPin] = useState("");
  const [seedSampleMenu, setSeedSampleMenu] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const parsedTables = Number(tableCount);
  const canSubmit =
    shopName.trim().length > 0 &&
    managerName.trim().length > 0 &&
    Number.isInteger(parsedTables) &&
    parsedTables >= 1 &&
    parsedTables <= 10 &&
    pin.length === 4 &&
    !busy;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    const payload: FirstRunInput = {
      shopName: shopName.trim(),
      tableCount: parsedTables,
      managerName: managerName.trim(),
      pin,
      seedSampleMenu,
    };
    setPin("");
    try {
      const ok = await onComplete(payload);
      if (!ok) setError("Không thể tạo quán. Kiểm tra dữ liệu rồi thử lại.");
    } catch {
      setError("Không thể tạo quán. Kiểm tra dữ liệu rồi thử lại.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="mb-1 text-center text-xl font-bold text-card-foreground sm:text-2xl">
            Thiết lập quán
          </h1>
          <p className="mb-6 text-center text-sm text-muted-foreground">
            Tạo tên quán, bàn, và PIN 4 số chỉ trên máy này. Không dùng PIN mẫu.
          </p>
          <form onSubmit={handleSubmit} noValidate aria-busy={busy}>
            <div className="mb-4">
              <label htmlFor="shop-name" className="mb-1.5 block text-sm font-medium text-foreground">
                Tên quán
              </label>
              <Input
                id="shop-name"
                value={shopName}
                onChange={(event) => setShopName(event.target.value)}
                disabled={busy}
                className="h-11"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="table-count" className="mb-1.5 block text-sm font-medium text-foreground">
                Số bàn
              </label>
              <Input
                id="table-count"
                type="number"
                inputMode="numeric"
                min={1}
                max={10}
                value={tableCount}
                onChange={(event) => setTableCount(event.target.value)}
                disabled={busy}
                className="h-11"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="manager-name" className="mb-1.5 block text-sm font-medium text-foreground">
                Tên quản lý
              </label>
              <Input
                id="manager-name"
                value={managerName}
                onChange={(event) => setManagerName(event.target.value)}
                disabled={busy}
                className="h-11"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="manager-pin" className="mb-1.5 block text-sm font-medium text-foreground">
                PIN 4 số
              </label>
              <Input
                id="manager-pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 4))}
                disabled={busy}
                placeholder="••••"
                className="h-11 text-center text-lg tracking-widest"
              />
            </div>
            <label className="mb-6 flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={seedSampleMenu}
                onChange={(event) => setSeedSampleMenu(event.target.checked)}
                disabled={busy}
                className="h-4 w-4"
              />
              Thêm menu mẫu
            </label>
            {error && (
              <div role="alert" className="mb-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
                {error}
              </div>
            )}
            <Button type="submit" disabled={!canSubmit} aria-busy={busy} className={cn("h-11 w-full text-base font-semibold")}>
              {busy ? "Đang tạo…" : "Tạo quán"}
            </Button>
          </form>
        </div>
      </div>
    </main>
  );
}
