import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MenuManagement } from "./MenuManagement";

describe("MenuManagement", () => {
  it("default filter 'Tất cả' is pressed", () => {
    render(<MenuManagement />);
    expect(screen.getByRole("button", { name: "Tất cả" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("other category filters are not pressed initially", () => {
    render(<MenuManagement />);
    expect(screen.getByRole("button", { name: "Cà phê" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Trà" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicking 'Trà' presses only that filter", () => {
    render(<MenuManagement />);
    fireEvent.click(screen.getByRole("button", { name: "Trà" }));
    expect(screen.getByRole("button", { name: "Trà" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Tất cả" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("names the pencil button for 'Cà phê đen'", () => {
    render(<MenuManagement />);
    expect(screen.getByRole("button", { name: "Sửa Cà phê đen" })).toBeInTheDocument();
  });

  it("names the trash button for 'Cà phê đen'", () => {
    render(<MenuManagement />);
    expect(screen.getByRole("button", { name: "Xóa Cà phê đen" })).toBeInTheDocument();
  });

  it("names the search field 'Tìm món'", () => {
    render(<MenuManagement />);
    expect(screen.getByRole("searchbox", { name: "Tìm món" })).toBeInTheDocument();
  });
});
