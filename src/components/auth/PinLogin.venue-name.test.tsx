import { describe, expect, test } from "vitest";
import { PinLoginScreen } from "./PinLogin";
import { render, screen } from "@testing-library/react";

const staff = [
  {
    id: "manager",
    tenantId: "tenant-local",
    name: "Quản lý",
    role: "manager" as const,
    pinHash: "v1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=",
    createdAt: 0,
  },
];

describe("PinLoginScreen venue name", () => {
  test("shows Quán Demo when tenantName is omitted", () => {
    render(<PinLoginScreen state="ready" staff={staff} onSignIn={async () => false} />);
    expect(screen.getByText("Quán Demo")).toBeTruthy();
  });

  test("shows provided tenant name instead of Quán Demo", () => {
    render(
      <PinLoginScreen
        state="ready"
        staff={staff}
        tenantName="Quán Nhà"
        onSignIn={async () => false}
      />,
    );
    expect(screen.getByText("Quán Nhà")).toBeTruthy();
    expect(screen.queryByText("Quán Demo")).toBeNull();
  });
});
