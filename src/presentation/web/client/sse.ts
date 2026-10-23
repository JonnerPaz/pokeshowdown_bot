/// <reference lib="dom" />

import type { ArenaRoomDto } from "../../../features/arena/arena.serializer.js";
import type { ArenaApi } from "./api.js";

export type RoomStreamStatus = "connecting" | "live" | "reconnecting";

export interface RoomStreamOptions {
  code: string;
  api: Pick<ArenaApi, "getStreamTicket">;
  onRoom(room: ArenaRoomDto): void;
  onStatus(status: RoomStreamStatus): void;
  onFatal(error: unknown): void;
  createEventSource?: ((url: string) => EventSource) | undefined;
}

const STREAM_EVENTS = ["snapshot", "room", "turn", "finished"] as const;

/**
 * Subscribes to a room's SSE endpoint with the browser's native `EventSource`,
 * authenticating with a short-lived HMAC ticket issued for that room.
 */
export function subscribeToRoom(options: RoomStreamOptions): () => void {
  let stopped = false;
  let source: EventSource | null = null;
  let renewedOnce = false;

  const openStream = async (): Promise<void> => {
    if (stopped) return;
    options.onStatus(renewedOnce ? "reconnecting" : "connecting");

    let ticket: string;
    try {
      const response = await options.api.getStreamTicket(options.code);
      ticket = response.ticket;
    } catch (error) {
      if (!stopped) options.onFatal(error);
      return;
    }

    if (stopped) return;

    const url = `/api/battles/${encodeURIComponent(options.code)}/events?ticket=${encodeURIComponent(ticket)}`;
    const factory =
      options.createEventSource ?? ((targetUrl: string) => new EventSource(targetUrl));
    const current = factory(url);
    source = current;

    const onMessage = (event: MessageEvent<string>): void => {
      if (stopped) return;
      try {
        const parsed = JSON.parse(event.data) as { room?: ArenaRoomDto } & ArenaRoomDto;
        const room = parsed.room ?? parsed;
        if (room && typeof room.code === "string") {
          options.onRoom(room);
        }
      } catch {
        // Ignore malformed event payloads.
      }
    };

    for (const eventName of STREAM_EVENTS) {
      current.addEventListener(eventName, onMessage as EventListener);
    }

    current.addEventListener("finished", () => {
      stopped = true;
      current.close();
    });

    current.onopen = () => {
      if (stopped) return;
      renewedOnce = false;
      options.onStatus("live");
    };

    current.onerror = () => {
      if (stopped) return;
      if (current.readyState === current.CLOSED) {
        current.close();
        if (!renewedOnce) {
          renewedOnce = true;
          void openStream();
          return;
        }
        options.onFatal(new Error("stream_closed"));
      } else {
        options.onStatus("reconnecting");
      }
    };
  };

  void openStream();

  return () => {
    stopped = true;
    source?.close();
    source = null;
  };
}
