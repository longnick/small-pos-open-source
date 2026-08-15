import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BackupPanel } from "./BackupPanel";

const pinHash = "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function backupJson() {
  return JSON.stringify({
    version: 1,
    exportedAt: 1,
    data: {
      tenants: [],
      staff: [{ id: "staff-1", pinHash }],
      catalogGroups: [],
      catalogItems: [],
      tables: [],
      orders: [],
      payments: [],
      shifts: [],
      auditLog: [],
    },
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BackupPanel", () => {
  it("names export and import when persist session is on", () => {
    render(<BackupPanel persistSession onExport={async () => null} onImport={async () => false} />);
    expect(screen.getByRole("button", { name: "Tải sao lưu" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nhập sao lưu" })).toBeInTheDocument();
  });

  it("disables export and import when persist session is off", () => {
    render(<BackupPanel persistSession={false} onExport={async () => null} onImport={async () => false} />);
    expect(screen.getByRole("button", { name: "Tải sao lưu" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nhập sao lưu" })).toBeDisabled();
  });

  it("export does not display pinHash or raw PIN", async () => {
    const onExport = vi.fn(async () => backupJson());
    render(<BackupPanel persistSession onExport={onExport} onImport={async () => false} />);
    fireEvent.click(screen.getByRole("button", { name: "Tải sao lưu" }));
    await waitFor(() => expect(onExport).toHaveBeenCalledTimes(1));
    expect(document.body.textContent).not.toContain(pinHash);
    expect(document.body.textContent).not.toMatch(/\b\d{4}\b/);
  });

  it("choosing a file does not import until confirm", async () => {
    const onImport = vi.fn(async () => true);
    const { container } = render(<BackupPanel persistSession onExport={async () => null} onImport={onImport} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeTruthy();
    const file = new File([backupJson()], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Xác nhận nhập sao lưu" })).toBeInTheDocument());
    expect(onImport).not.toHaveBeenCalled();
  });

  it("confirm imports then shows success without pinHash", async () => {
    const onImport = vi.fn(async () => true);
    const { container } = render(<BackupPanel persistSession onExport={async () => null} onImport={onImport} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([backupJson()], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Xác nhận nhập sao lưu" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Nhập và thay thế dữ liệu" }));
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status", { name: "Đã nhập sao lưu" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(pinHash);
  });

  it("rejected import shows generic fail and does not display pinHash", async () => {
    const onImport = vi.fn(async () => false);
    const { container } = render(<BackupPanel persistSession onExport={async () => null} onImport={onImport} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["{"], "bad.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Xác nhận nhập sao lưu" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Nhập và thay thế dữ liệu" }));
    await waitFor(() => expect(onImport).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status", { name: "Không thể sao lưu" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("{");
    expect(document.body.textContent).not.toContain(pinHash);
  });

  it("thrown export shows generic fail without payload", async () => {
    const onExport = vi.fn(async () => {
      throw new Error("disk");
    });
    render(<BackupPanel persistSession onExport={onExport} onImport={async () => false} />);
    fireEvent.click(screen.getByRole("button", { name: "Tải sao lưu" }));
    expect(await screen.findByRole("status", { name: "Không thể sao lưu" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain("disk");
  });

  it("imported-unusable is distinct from unchanged fail", async () => {
    const onImport = vi.fn(async () => "imported-unusable" as const);
    const { container } = render(<BackupPanel persistSession onExport={async () => null} onImport={onImport} />);
    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([backupJson()], "backup.json", { type: "application/json" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByRole("dialog", { name: "Xác nhận nhập sao lưu" })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Nhập và thay thế dữ liệu" }));
    expect(await screen.findByRole("status", { name: "Đã nhập sao lưu nhưng không dùng được" })).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(pinHash);
  });
});
