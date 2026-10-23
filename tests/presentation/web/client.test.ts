import { describe, expect, it, vi } from "vitest";

import type { ArenaRoomDto } from "../../../src/features/arena/arena.serializer.js";
import { subscribeToRoom } from "../../../src/presentation/web/client/sse.js";

class FakeEventSource {
  public readonly CONNECTING = 0 as const;
  public readonly OPEN = 1 as const;
  public readonly CLOSED = 2 as const;
  public readyState = 0;
  public closed = false;
  public onopen: (() => void) | null = null;
  public onerror: (() => void) | null = null;
  private readonly listeners = new Map<string, Set<(event: { data: string }) => void>>();

  constructor(public readonly url: string) {}

  public addEventListener(type: string, listener: EventListener): void {
    const set = this.listeners.get(type) ?? new Set();
    set.add(listener as unknown as (event: { data: string }) => void);
    this.listeners.set(type, set);
  }

  public emitOpen(): void {
    this.readyState = this.OPEN;
    this.onopen?.();
  }

  public emitEvent(type: string, payload: unknown): void {
    const data = JSON.stringify(payload);
    for (const listener of this.listeners.get(type) ?? []) {
      listener({ data });
    }
  }

  public emitError(closed: boolean): void {
    this.readyState = closed ? this.CLOSED : this.CONNECTING;
    this.onerror?.();
  }

  public close(): void {
    this.closed = true;
    this.readyState = this.CLOSED;
  }
}

describe("mini app EventSource subscriber", () => {
  it("fetches a stream ticket, connects EventSource, and forwards room events", async () => {
    const sources: FakeEventSource[] = [];
    const rooms: string[] = [];
    const statuses: string[] = [];

    const stop = subscribeToRoom({
      code: "ABC123",
      api: {
        getStreamTicket: vi.fn(async () => ({ ticket: "signed-ticket-1" })),
      },
      onRoom: (room) => rooms.push(`${room.code}:${room.revision}`),
      onStatus: (status) => statuses.push(status),
      onFatal: vi.fn(),
      createEventSource: (url) => {
        const source = new FakeEventSource(url);
        sources.push(source);
        return source as unknown as EventSource;
      },
    });

    await vi.waitFor(() => expect(sources).toHaveLength(1));
    expect(sources[0]?.url).toBe("/api/battles/ABC123/events?ticket=signed-ticket-1");

    sources[0]!.emitOpen();
    sources[0]!.emitEvent("snapshot", { code: "ABC123", revision: 1 } as ArenaRoomDto);
    sources[0]!.emitEvent("turn", {
      room: { code: "ABC123", revision: 2 } as ArenaRoomDto,
      result: {},
    });
    sources[0]!.emitEvent("finished", { code: "ABC123", revision: 3 } as ArenaRoomDto);

    expect(statuses).toEqual(["connecting", "live"]);
    expect(rooms).toEqual(["ABC123:1", "ABC123:2", "ABC123:3"]);
    expect(sources[0]?.closed).toBe(true);
    stop();
  });

  it("renews the ticket once when the EventSource closes unexpectedly", async () => {
    const sources: FakeEventSource[] = [];
    let ticketCounter = 0;
    const onFatal = vi.fn();

    const stop = subscribeToRoom({
      code: "ABC123",
      api: {
        getStreamTicket: vi.fn(async () => ({ ticket: `ticket-${++ticketCounter}` })),
      },
      onRoom: vi.fn(),
      onStatus: vi.fn(),
      onFatal,
      createEventSource: (url) => {
        const source = new FakeEventSource(url);
        sources.push(source);
        return source as unknown as EventSource;
      },
    });

    await vi.waitFor(() => expect(sources).toHaveLength(1));
    sources[0]!.emitOpen();

    // First unexpected close triggers ticket renewal
    sources[0]!.emitError(true);
    await vi.waitFor(() => expect(sources).toHaveLength(2));
    expect(sources[1]?.url).toBe("/api/battles/ABC123/events?ticket=ticket-2");
    expect(onFatal).not.toHaveBeenCalled();

    // Second consecutive close before opening is treated as fatal
    sources[1]!.emitError(true);
    expect(onFatal).toHaveBeenCalledTimes(1);
    stop();
  });
});
