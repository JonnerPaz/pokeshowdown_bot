import { describe, expect, it } from "vitest";

import {
  StreamTicketError,
  deriveStreamTicketKey,
  issueStreamTicket,
  verifyStreamTicket,
} from "../../../src/presentation/web/streamTicket.js";

const KEY = deriveStreamTicketKey("123456:TEST_TOKEN");

function expectTicketError(fn: () => unknown, code: string, status: number): void {
  try {
    fn();
  } catch (error) {
    expect(error).toBeInstanceOf(StreamTicketError);
    expect((error as StreamTicketError).code).toBe(code);
    expect((error as StreamTicketError).status).toBe(status);
    return;
  }
  throw new Error(`expected StreamTicketError(${code}, ${status})`);
}

describe("streamTicket", () => {
  it("issues and verifies a valid room stream ticket", () => {
    const now = 1_700_000_000_000;
    const ticket = issueStreamTicket(KEY, 42, "abc234", 900, now);

    const telegramId = verifyStreamTicket(KEY, ticket, "ABC234", now + 30_000);
    expect(telegramId).toBe(42);
  });

  it("rejects missing or malformed tickets", () => {
    expectTicketError(() => verifyStreamTicket(KEY, undefined, "ABC234"), "missing_ticket", 401);
    expectTicketError(() => verifyStreamTicket(KEY, "", "ABC234"), "missing_ticket", 401);
    expectTicketError(
      () => verifyStreamTicket(KEY, "not-four-parts", "ABC234"),
      "malformed_ticket",
      401,
    );
    expectTicketError(
      () => verifyStreamTicket(KEY, "abc.ABC234.123.deadbeef", "ABC234"),
      "malformed_ticket",
      401,
    );
  });

  it("rejects tickets with a tampered signature or signed with another key", () => {
    const now = 1_700_000_000_000;
    const ticket = issueStreamTicket(KEY, 42, "ABC234", 900, now);
    const otherKey = deriveStreamTicketKey("999999:OTHER_TOKEN");

    expectTicketError(
      () => verifyStreamTicket(otherKey, ticket, "ABC234", now),
      "bad_ticket_signature",
      401,
    );

    const tampered = ticket.slice(0, -1) + (ticket.endsWith("0") ? "1" : "0");
    expectTicketError(
      () => verifyStreamTicket(KEY, tampered, "ABC234", now),
      "bad_ticket_signature",
      401,
    );
  });

  it("rejects a valid ticket presented for a different room", () => {
    const now = 1_700_000_000_000;
    const ticket = issueStreamTicket(KEY, 42, "ABC234", 900, now);

    expectTicketError(
      () => verifyStreamTicket(KEY, ticket, "XYZ987", now),
      "ticket_room_mismatch",
      403,
    );
  });

  it("rejects an expired ticket", () => {
    const now = 1_700_000_000_000;
    const ticket = issueStreamTicket(KEY, 42, "ABC234", 60, now);

    expectTicketError(
      () => verifyStreamTicket(KEY, ticket, "ABC234", now + 61_000),
      "ticket_expired",
      401,
    );
  });
});
