import React from "react";
import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { CatalogGroup, CatalogItem } from "../../../packages/pos-core/src/types";
import { MenuGrid } from "./MenuGrid";

// ---------------------------------------------------------------------------
// Fixtures – intentionally unsorted to verify sort logic
// ---------------------------------------------------------------------------

const tenantId = "tenant-demo";

const makeGroup = (
  id: string,
  name: string,
  sortOrder: number,
): CatalogGroup => ({ id, tenantId, name, sortOrder });

const makeItem = (
  id: string,
  groupId: string,
  name: string,
  price: number,
  available: boolean,
  sortOrder: number,
): CatalogItem => ({
  id,
  tenantId,
  groupId,
  name,
  price,
  available,
  sortOrder,
  createdAt: 0,
  updatedAt: 0,
});

// Groups intentionally in reverse sortOrder to test sort
const groups: CatalogGroup[] = [
  makeGroup("g2", "Trà", 2),
  makeGroup("g1", "Cà phê", 1),
  makeGroup("g3", "Đồ ăn", 3),
];

// Items intentionally mixed order; one unavailable item per group
const items: CatalogItem[] = [
  // g1: cà phê – sortOrder desc intentionally, one unavailable
  makeItem("c2", "g1", "Cà phê sữa", 30000, true, 2),
  makeItem("c1", "g1", "Cà phê đen", 25000, true, 1),
  makeItem("c3", "g1", "Cà phê trứng", 45000, false, 3), // unavailable

  // g2: trà
  makeItem("t2", "g2", "Trà vải", 35000, true, 2),
  makeItem("t1", "g2", "Trà đào", 35000, true, 1),

  // g3: đồ ăn
  makeItem("f1", "g3", "Cơm gà", 55000, true, 1),
];

// ---------------------------------------------------------------------------

describe("MenuGrid", () => {
  // --- group sorting ---

  it("renders category pills sorted by sortOrder then id", () => {
    render(<MenuGrid groups={groups} items={items} />);

    // Find all category pill buttons (text-only pills)
    const pills = screen.getAllByRole("button", { name: /Cà phê|Trà|Đồ ăn/i });
    expect(pills[0]).toHaveTextContent("Cà phê"); // sortOrder 1
    expect(pills[1]).toHaveTextContent("Trà");     // sortOrder 2
    expect(pills[2]).toHaveTextContent("Đồ ăn");   // sortOrder 3
  });

  it("defaults to the first group (lowest sortOrder) on initial render", () => {
    render(<MenuGrid groups={groups} items={items} />);

    // The default active group is g1 "Cà phê", so its items should be visible
    expect(screen.getByText("Cà phê đen")).toBeInTheDocument();
    expect(screen.getByText("Cà phê sữa")).toBeInTheDocument();
  });

  it("default category 'Cà phê' is pressed", () => {
    render(<MenuGrid groups={groups} items={items} />);
    expect(screen.getByRole("button", { name: "Cà phê" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("other category pills are not pressed initially", () => {
    render(<MenuGrid groups={groups} items={items} />);
    expect(screen.getByRole("button", { name: "Trà" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(screen.getByRole("button", { name: "Đồ ăn" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("clicking 'Trà' presses only that category", () => {
    render(<MenuGrid groups={groups} items={items} />);
    fireEvent.click(screen.getByRole("button", { name: "Trà" }));
    expect(screen.getByRole("button", { name: "Trà" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Cà phê" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  // --- available items only ---

  it("shows only available items for the active group", () => {
    render(<MenuGrid groups={groups} items={items} />);

    // "Cà phê trứng" is unavailable → must not appear
    expect(screen.queryByText("Cà phê trứng")).not.toBeInTheDocument();
  });

  it("renders available items sorted by sortOrder then id", () => {
    render(<MenuGrid groups={groups} items={items} />);

    const cards = screen.getAllByRole("button", { name: /\+/ });
    // There are 2 available items in g1; verify first item name is "Cà phê đen" (sortOrder 1)
    // We check the containing card text order via DOM order
    const allText = document.body.textContent ?? "";
    const idxDen = allText.indexOf("Cà phê đen");
    const idxSua = allText.indexOf("Cà phê sữa");
    expect(idxDen).toBeGreaterThan(-1);
    expect(idxSua).toBeGreaterThan(-1);
    expect(idxDen).toBeLessThan(idxSua); // sortOrder 1 before sortOrder 2
    // 2 available items → 2 + buttons
    expect(cards).toHaveLength(2);
  });

  // --- switching groups ---

  it("shows items of the clicked group and hides the previous group's items", () => {
    render(<MenuGrid groups={groups} items={items} />);

    fireEvent.click(screen.getByRole("button", { name: /Trà/i }));

    expect(screen.getByText("Trà đào")).toBeInTheDocument();
    expect(screen.getByText("Trà vải")).toBeInTheDocument();
    expect(screen.queryByText("Cà phê đen")).not.toBeInTheDocument();
  });

  // --- search: trim & case-insensitive ---

  it("filters items in the active group case-insensitively and trimming whitespace", () => {
    render(<MenuGrid groups={groups} items={items} />);

    const searchInput = screen.getByRole("searchbox");
    // Mixed case + leading/trailing spaces
    fireEvent.change(searchInput, { target: { value: "  CÀ PHÊ SỮA  " } });

    expect(screen.getByText("Cà phê sữa")).toBeInTheDocument();
    expect(screen.queryByText("Cà phê đen")).not.toBeInTheDocument();
  });

  it("exposes the searchbox as a Vietnamese named search field", () => {
    render(<MenuGrid groups={groups} items={items} />);
    expect(screen.getByRole("searchbox", { name: "Tìm món" })).toBeTruthy();
  });

  // --- empty catalog text ---

  it("shows exact text 'Chưa có món để hiển thị' when groups/items are empty", () => {
    render(<MenuGrid groups={[]} items={[]} />);
    expect(screen.getByText("Chưa có món để hiển thị")).toBeInTheDocument();
  });

  it("exposes the empty catalog state as a Vietnamese status", () => {
    render(<MenuGrid groups={[]} items={[]} />);
    expect(
      screen.getByRole("status", { name: "Chưa có món để hiển thị" }),
    ).toBeTruthy();
  });

  // --- group with no matching query ---

  it("shows exact text 'Không tìm thấy món nào' when search matches nothing in active group", () => {
    render(<MenuGrid groups={groups} items={items} />);

    const searchInput = screen.getByRole("searchbox");
    fireEvent.change(searchInput, { target: { value: "xyzxyzxyz" } });

    expect(screen.getByText("Không tìm thấy món nào")).toBeInTheDocument();
  });

  it("exposes the search no-result state as a Vietnamese status", () => {
    render(<MenuGrid groups={groups} items={items} />);

    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "xyzxyzxyz" },
    });

    expect(
      screen.getByRole("status", { name: "Không tìm thấy món nào" }),
    ).toBeTruthy();
  });

  // --- reconcile removed active group ---

  it("resets to first current group when the active group is removed via rerender", () => {
    const { rerender } = render(<MenuGrid groups={groups} items={items} />);

    // Select g3 "Đồ ăn" (sortOrder 3)
    fireEvent.click(screen.getByRole("button", { name: /Đồ ăn/i }));
    expect(screen.getByText("Cơm gà")).toBeInTheDocument();

    // Remove g3 from the groups list; new first group is g1 "Cà phê"
    const reducedGroups = groups.filter((g) => g.id !== "g3");
    rerender(<MenuGrid groups={reducedGroups} items={items} />);

    // Should now show g1's items
    expect(screen.getByText("Cà phê đen")).toBeInTheDocument();
    expect(screen.queryByText("Cơm gà")).not.toBeInTheDocument();
  });

  // --- price formatting ---

  it("renders VND-formatted price on item cards", () => {
    render(<MenuGrid groups={groups} items={items} />);

    // 25000 VND → "25.000 ₫" in vi-VN locale
    expect(screen.getByText(/25\.000/)).toBeInTheDocument();
  });

  // --- + button is presentational only ---

  it("renders a + button per visible item with no side-effects on click", () => {
    render(<MenuGrid groups={groups} items={items} />);

    const addButtons = screen.getAllByRole("button", { name: /\+/ });
    expect(addButtons.length).toBeGreaterThan(0);
    // Clicking should not throw
    expect(() => fireEvent.click(addButtons[0])).not.toThrow();
  });
});
