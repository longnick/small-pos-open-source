import type { DomainEvent } from "./types";

type EventType = DomainEvent["type"];
type EventOf<Type extends EventType> = Extract<DomainEvent, { type: Type }>;
type Handler<Event extends DomainEvent> = (event: Event) => void;

export class EventBus {
  private readonly handlers = new Map<EventType, Set<Handler<DomainEvent>>>();

  on<Type extends EventType>(type: Type, handler: Handler<EventOf<Type>>): () => void {
    const handlers = this.handlers.get(type) ?? new Set<Handler<DomainEvent>>();
    this.handlers.set(type, handlers);
    handlers.add(handler as Handler<DomainEvent>);

    return () => {
      handlers.delete(handler as Handler<DomainEvent>);
    };
  }

  emit(event: DomainEvent): void {
    for (const handler of [...(this.handlers.get(event.type) ?? [])]) {
      handler(event);
    }
  }

  clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new EventBus();
