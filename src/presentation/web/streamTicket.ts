import { createHmac, timingSafeEqual } from "node:crypto";

export const DEFAULT_STREAM_TICKET_TTL_SECONDS = 900;

export type StreamTicketErrorCode =
  | "missing_ticket"
  | "malformed_ticket"
  | "bad_ticket_signature"
  | "ticket_expired"
  | "ticket_room_mismatch";

export class StreamTicketError extends Error {
  public readonly code: StreamTicketErrorCode;
  public readonly status: number;

  constructor(code: StreamTicketErrorCode, status: number, message: string) {
    super(message);
    this.name = "StreamTicketError";
    this.code = code;
    this.status = status;
  }
}

const DIGITS_PATTERN = /^\d+$/;
const HEX64_PATTERN = /^[a-f0-9]{64}$/i;

export function deriveStreamTicketKey(botToken: string): Buffer {
  return createHmac("sha256", "arena-stream").update(botToken).digest();
}

export function issueStreamTicket(
  key: Buffer,
  telegramId: number,
  code: string,
  ttlSeconds: number = DEFAULT_STREAM_TICKET_TTL_SECONDS,
  nowMs: number = Date.now(),
): string {
  const normalizedCode = code.trim().toUpperCase();
  const expiresAt = Math.floor(nowMs / 1000) + ttlSeconds;
  const payload = `${telegramId}.${normalizedCode}.${expiresAt}`;
  const signature = createHmac("sha256", key).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyStreamTicket(
  key: Buffer,
  ticket: string | undefined,
  expectedCode: string,
  nowMs: number = Date.now(),
): number {
  if (!ticket || ticket.trim() === "") {
    throw new StreamTicketError("missing_ticket", 401, "Stream ticket is required");
  }

  const parts = ticket.split(".");
  if (parts.length !== 4) {
    throw new StreamTicketError("malformed_ticket", 401, "Stream ticket is malformed");
  }

  const [rawId, rawCode, rawExp, signature] = parts as [string, string, string, string];
  if (
    !DIGITS_PATTERN.test(rawId) ||
    !rawCode ||
    !DIGITS_PATTERN.test(rawExp) ||
    !HEX64_PATTERN.test(signature)
  ) {
    throw new StreamTicketError("malformed_ticket", 401, "Stream ticket is malformed");
  }

  const payload = `${rawId}.${rawCode}.${rawExp}`;
  const expected = createHmac("sha256", key).update(payload).digest();
  const received = Buffer.from(signature, "hex");

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new StreamTicketError("bad_ticket_signature", 401, "Stream ticket signature is invalid");
  }

  if (rawCode.toUpperCase() !== expectedCode.trim().toUpperCase()) {
    throw new StreamTicketError(
      "ticket_room_mismatch",
      403,
      "Stream ticket does not match this room",
    );
  }

  const expiresAt = Number(rawExp);
  if (Math.floor(nowMs / 1000) > expiresAt) {
    throw new StreamTicketError("ticket_expired", 401, "Stream ticket has expired");
  }

  return Number(rawId);
}
