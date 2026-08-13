import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { KitchenPanel } from "./KitchenPanel";

describe("KitchenPanel", () => {
  it("shows exact text 'Chưa có phiếu bếp nào' when the active filter has no tickets", () => {
    render(<KitchenPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Sẵn sàng" }));
    expect(screen.getByText("Chưa có phiếu bếp nào")).toBeInTheDocument();
  });

  it("exposes the empty kitchen state as a Vietnamese status", () => {
    render(<KitchenPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Sẵn sàng" }));
    expect(
      screen.getByRole("status", { name: "Chưa có phiếu bếp nào" }),
    ).toBeTruthy();
  });

  it("still shows dummy tickets under the default processing filter", () => {
    render(<KitchenPanel />);
    expect(screen.getByText("Bàn 1")).toBeInTheDocument();
    expect(screen.queryByText("Chưa có phiếu bếp nào")).not.toBeInTheDocument();
  });

  it("default filter 'Đang xử lý' is pressed", () => {
    render(<KitchenPanel />);
    expect(screen.getByRole("button", { name: "Đang xử lý" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("other filters are not pressed initially", () => {
    render(<KitchenPanel />);
    expect(screen.getByRole("button", { name: "Chờ làm" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Sẵn sàng" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicking 'Sẵn sàng' presses only that filter", () => {
    render(<KitchenPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Sẵn sàng" }));
    expect(screen.getByRole("button", { name: "Sẵn sàng" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Đang xử lý" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
