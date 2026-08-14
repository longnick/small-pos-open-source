import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { StaffManagement } from "./StaffManagement";

describe("StaffManagement", () => {
  it("default filter 'Tất cả ca' is pressed", () => {
    render(<StaffManagement />);
    expect(screen.getByRole("button", { name: "Tất cả ca" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("other shift filters are not pressed initially", () => {
    render(<StaffManagement />);
    expect(screen.getByRole("button", { name: "Ca sáng" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Ca chiều" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Ca tối" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicking 'Ca chiều' presses only that filter", () => {
    render(<StaffManagement />);
    fireEvent.click(screen.getByRole("button", { name: "Ca chiều" }));
    expect(screen.getByRole("button", { name: "Ca chiều" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Tất cả ca" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Ca sáng" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("names the trash button for 'Nguyễn Minh Anh'", () => {
    render(<StaffManagement />);
    expect(screen.getByRole("button", { name: "Xóa Nguyễn Minh Anh" })).toBeInTheDocument();
  });
});
