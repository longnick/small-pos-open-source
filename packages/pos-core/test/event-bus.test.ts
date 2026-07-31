import { expect, test } from "vitest";
import { EventBus } from "../src/event-bus";
import type { DomainEvent } from "../src/types";

const opened: DomainEvent = {
  type: "order.opened",
  payload: { orderId: "order-1", tableId: "table-1" },
};

test("dispatches only handlers for exact event type", () => {
  const bus = new EventBus();
  const received: string[] = [];

  bus.on("order.opened", (event) => received.push(event.payload.tableId));
  bus.on("order.sent", (event) => received.push(event.payload.orderId));
  bus.emit(opened);

  expect(received).toEqual(["table-1"]);
});

test("dispatches handlers in insertion order", () => {
  const bus = new EventBus();
  const received: number[] = [];

  bus.on("order.opened", () => received.push(1));
  bus.on("order.opened", () => received.push(2));
  bus.on("order.opened", () => received.push(3));
  bus.emit(opened);

  expect(received).toEqual([1, 2, 3]);
});

test("unsubscribe is idempotent", () => {
  const bus = new EventBus();
  const handler = () => {
    throw new Error("should not run");
  };
  const unsubscribe = bus.on("order.opened", handler);

  unsubscribe();
  unsubscribe();
  bus.emit(opened);
});

test("dispatch snapshots handlers before dispatch", () => {
  const bus = new EventBus();
  const received: string[] = [];
  const second = () => received.push("second");

  bus.on("order.opened", () => {
    received.push("first");
    unsubscribeSecond();
  });
  const unsubscribeSecond = bus.on("order.opened", second);

  bus.emit(opened);
  bus.emit(opened);

  expect(received).toEqual(["first", "second", "first"]);
});

test("clear removes all handlers", () => {
  const bus = new EventBus();
  const handler = () => {
    throw new Error("should not run");
  };

  bus.on("order.opened", handler);
  bus.on("order.sent", handler);
  bus.clear();
  bus.emit(opened);
  bus.emit({ type: "order.sent", payload: { orderId: "order-1" } });
});

test("handler errors fail fast without dispatching later handlers", () => {
  const bus = new EventBus();
  const error = new Error("failed");
  const later = () => {
    throw new Error("later handler should not run");
  };

  bus.on("order.opened", () => {
    throw error;
  });
  bus.on("order.opened", later);

  expect(() => bus.emit(opened)).toThrow(error);
});
