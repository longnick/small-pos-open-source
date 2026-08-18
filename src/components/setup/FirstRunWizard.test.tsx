import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

describe("FirstRunWizard", () => {
  it("renders setup heading without POS shell or demo PIN copy", async () => {
    const { FirstRunWizard } = await import("./FirstRunWizard");
    const { container } = render(<FirstRunWizard onComplete={async () => false} />);
    expect(container.querySelector("header")).toBeNull();
    expect(screen.getByRole("heading", { name: "Thiết lập quán" })).toBeTruthy();
    expect(screen.queryByText("Quán Demo")).toBeNull();
    expect(screen.queryByText("0000")).toBeNull();
    expect(screen.queryByText("1111")).toBeNull();
  });

  it("keeps submit disabled until shop, tables, manager, and 4-digit PIN are valid", async () => {
    const { FirstRunWizard } = await import("./FirstRunWizard");
    render(<FirstRunWizard onComplete={async () => false} />);
    const submit = screen.getByRole("button", { name: "Tạo quán" });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Tên quán"), { target: { value: "Quán Nhà" } });
    fireEvent.change(screen.getByLabelText("Số bàn"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Tên quản lý"), { target: { value: "Chủ quán" } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText("PIN 4 số"), { target: { value: "5821" } });
    expect(submit).not.toBeDisabled();
  });

  it("submits trimmed fields, optional menu, and clears the PIN", async () => {
    const { FirstRunWizard } = await import("./FirstRunWizard");
    const onComplete = vi.fn(async () => true);
    render(<FirstRunWizard onComplete={onComplete} />);

    fireEvent.change(screen.getByLabelText("Tên quán"), { target: { value: "  Quán Nhà  " } });
    fireEvent.change(screen.getByLabelText("Số bàn"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Tên quản lý"), { target: { value: " Chủ quán " } });
    fireEvent.change(screen.getByLabelText("PIN 4 số"), { target: { value: "5821" } });
    fireEvent.click(screen.getByLabelText("Thêm menu mẫu"));
    fireEvent.click(screen.getByRole("button", { name: "Tạo quán" }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith({
      shopName: "Quán Nhà",
      tableCount: 4,
      managerName: "Chủ quán",
      pin: "5821",
      seedSampleMenu: true,
    });
    expect(screen.getByLabelText("PIN 4 số")).toHaveValue("");
  });
});
