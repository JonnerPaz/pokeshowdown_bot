/// <reference lib="dom" />

export interface SseMessage {
  event: string;
  data: string;
  id?: string;
}

export interface SseParser {
  feed(chunk: string): SseMessage[];
}

/**
 * Incremental Server-Sent Events parser. Kept as a pure state machine so the
 * browser client and the tests share exactly the same framing rules.
 */
export function createSseParser(): SseParser {
  let buffer = "";

  return {
    feed(chunk: string): SseMessage[] {
      buffer += chunk.replace(/\r\n/g, "\n");
      const messages: SseMessage[] = [];

      for (;;) {
        const boundary = buffer.indexOf("\n\n");
        if (boundary === -1) break;

        const frame = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const message = parseFrame(frame);
        if (message) messages.push(message);
      }

      return messages;
    },
  };
}

function parseFrame(frame: string): SseMessage | null {
  let event = "message";
  let id: string | undefined;
  const data: string[] = [];

  for (const line of frame.split("\n")) {
    if (!line || line.startsWith(":")) continue;

    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    else if (field === "data") data.push(value);
    else if (field === "id") id = value;
  }

  if (data.length === 0) return null;
  return id === undefined ? { event, data: data.join("\n") } : { event, data: data.join("\n"), id };
}

export type RoomStreamStatus = "connecting" | "live" | "reconnecting";

export class SseHttpError extends Error {
  public readonly status: number;
  public readonly code: string;

  constructor(status: number, code: string) {
    super(`SSE request failed with ${status}`);
    this.name = "SseHttpError";
    this.status = status;
    this.code = code;
  }
}

export interface RoomStreamHandlers {
  onEvent(message: SseMessage): void;
  onStatus(status: RoomStreamStatus): void;
  onFatal?(error: unknown): void;
}

export interface RoomStreamOptions {
  code: string;
  initData: string;
  handlers: RoomStreamHandlers;
  reconnectBaseMs?: number;
  reconnectMaxMs?: number;
}

/**
 * Reads the room SSE endpoint with `fetch` instead of `EventSource`: browsers
 * cannot attach custom headers to `EventSource`, and the API authenticates
 * every request with the signed Telegram init data header.
 */
export function subscribeToRoom(options: RoomStreamOptions): () => void {
  const baseMs = options.reconnectBaseMs ?? 1_000;
  const maxMs = options.reconnectMaxMs ?? 10_000;

  let stopped = false;
  let terminal = false;
  let retry = 0;
  let controller: AbortController | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const connect = async (): Promise<void> => {
    if (stopped || terminal) return;

    // A reconnect starts a brand new stream: never carry a partial frame over
    // from the previous connection.
    const parser = createSseParser();
    options.handlers.onStatus(retry === 0 ? "connecting" : "reconnecting");
    controller = new AbortController();

    try {
      const response = await fetch(`/api/battles/${encodeURIComponent(options.code)}/events`, {
        headers: { "x-telegram-init-data": options.initData },
        signal: controller.signal,
      });

      if (!response.ok) {
        let code = "http_error";
        try {
          const body = (await response.json()) as { error?: { code?: string } };
          code = body.error?.code ?? code;
        } catch {
          // Keep the generic code when the body is not JSON.
        }

        const error = new SseHttpError(response.status, code);
        if ([401, 403, 404].includes(response.status)) {
          options.handlers.onFatal?.(error);
          return;
        }
        throw error;
      }

      if (!response.body) throw new Error("SSE response has no body");

      retry = 0;
      options.handlers.onStatus("live");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;

        for (const message of parser.feed(decoder.decode(value, { stream: true }))) {
          if (message.event === "finished") terminal = true;
          options.handlers.onEvent(message);
        }
      }

      if (!stopped && !terminal) throw new Error("SSE stream ended unexpectedly");
    } catch {
      if (stopped || terminal || controller?.signal.aborted) return;

      retry += 1;
      const delay = Math.min(baseMs * 2 ** (retry - 1), maxMs);
      options.handlers.onStatus("reconnecting");
      timer = setTimeout(() => void connect(), delay);
    }
  };

  void connect();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    controller?.abort();
  };
}
