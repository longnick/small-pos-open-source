import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

describe("SetupRecovery", () => {
  it("renders corrupt recovery without POS shell or demo PIN", async () => {
    const { SetupRecovery } = await import("./SetupRecovery");
    const { container } = render(<SetupRecovery onImport={async () => false} />);
    expect(container.querySelector("header")).toBeNull();
    expect(screen.getByRole("heading", { name: "Không thể đọc dữ liệu quán" })).toBeTruthy();
    expect(screen.queryByText("Quán Demo")).toBeNull();
    expect(screen.queryByText("0000")).toBeNull();
  });

  it("imports selected backup file", async () => {
    const { SetupRecovery } = await import("./SetupRecovery");
    const onImport = vi.fn(async () => true);
    render(<SetupRecovery onImport={onImport} />);
    const file = new File(["{}"], "backup.json", { type: "application/json" });
    fireEvent.change(screen.getByLabelText("Nhập sao lưu"), { target: { files: [file] } });
    await waitFor(() => expect(onImport).toHaveBeenCalledWith("{}"));
  });
});
