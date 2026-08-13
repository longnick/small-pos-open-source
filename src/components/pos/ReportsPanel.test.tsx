import React from "react";
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ReportsPanel } from "./ReportsPanel";

describe("ReportsPanel", () => {
  it("default range '7 ngày' is pressed", () => {
    render(<ReportsPanel />);
    expect(screen.getByRole("button", { name: "7 ngày" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("other range chips are not pressed initially", () => {
    render(<ReportsPanel />);
    expect(screen.getByRole("button", { name: "Hôm nay" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Tháng này" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicking 'Hôm nay' presses only that range", () => {
    render(<ReportsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Hôm nay" }));
    expect(screen.getByRole("button", { name: "Hôm nay" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "7 ngày" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Tháng này" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });
});
