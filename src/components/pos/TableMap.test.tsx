import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { PosTable } from "../../../packages/pos-core/src/types";
import { TableMap } from "./TableMap";

// ---------------------------------------------------------------------------
// Fixtures – intentionally unsorted (number desc) to verify display sort
// ---------------------------------------------------------------------------

const tables: PosTable[] = [
  {
    id: "t3",
    tenantId: "tenant-demo",
    number: 3,
    status: "empty",
    openedAt: 0,
    staffId: "s1",
  },
  {
    id: "t1",
    tenantId: "tenant-demo",
    number: 1,
    status: "occupied",
    openedAt: 0,
    staffId: "s1",
  },
  {
    id: "t2",
    tenantId: "tenant-demo",
    number: 2,
    status: "waiting_payment",
    openedAt: 0,
    staffId: "s1",
  },
];

// ---------------------------------------------------------------------------

describe("TableMap", () => {
  it("renders three table cards sorted by number ascending (Bàn 1, Bàn 2, Bàn 3)", () => {
    render(
      <TableMap
        tables={tables}
        selectedTableId={null}
        onSelect={() => {}}
      />
    );

    const buttons = screen.getAllByRole("button");
    // There should be exactly 3 table buttons
    expect(buttons).toHaveLength(3);

    // Verify labels in sorted order: number 1, 2, 3
    expect(buttons[0]).toHaveTextContent("Bàn 1");
    expect(buttons[1]).toHaveTextContent("Bàn 2");
    expect(buttons[2]).toHaveTextContent("Bàn 3");
  });

  it("displays exact Vietnamese status labels: empty→Trống, occupied→Có khách, waiting_payment→Chờ thanh toán", () => {
    render(
      <TableMap
        tables={tables}
        selectedTableId={null}
        onSelect={() => {}}
      />
    );

    // occupied (number 1) → Có khách
    const btn1 = screen.getByRole("button", { name: /Bàn 1/i });
    expect(btn1).toHaveTextContent("Có khách");

    // waiting_payment (number 2) → Chờ thanh toán
    const btn2 = screen.getByRole("button", { name: /Bàn 2/i });
    expect(btn2).toHaveTextContent("Chờ thanh toán");

    // empty (number 3) → Trống
    const btn3 = screen.getByRole("button", { name: /Bàn 3/i });
    expect(btn3).toHaveTextContent("Trống");
  });

  it("calls onSelect with tableId when a table card is clicked", () => {
    const onSelect = vi.fn();

    render(
      <TableMap
        tables={tables}
        selectedTableId={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Bàn 1/i }));
    expect(onSelect).toHaveBeenCalledWith("t1");
  });

  it("applies selected ring to the currently selected table", () => {
    render(
      <TableMap
        tables={tables}
        selectedTableId="t2"
        onSelect={() => {}}
      />
    );

    const btn2 = screen.getByRole("button", { name: /Bàn 2/i });
    // The selected button should have the ring class applied
    expect(btn2.className).toMatch(/ring-2/);
  });

  it("exposes the empty table-map state as a Vietnamese status", () => {
    render(
      <TableMap tables={[]} selectedTableId={null} onSelect={() => {}} />,
    );

    expect(
      screen.getByRole("status", { name: "Chưa có bàn để hiển thị" }),
    ).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
