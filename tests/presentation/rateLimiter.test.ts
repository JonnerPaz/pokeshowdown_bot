import { describe, it, expect, beforeEach, vi } from "vitest";
import { MEMORY_PRUNE_INTERVAL } from "../../src/domain/data/constants.js";
import { RateLimiterService } from "../../src/presentation/services/rateLimiter.service.js";

describe("RateLimiterService", () => {
  let rateLimiter: RateLimiterService;

  beforeEach(() => {
    rateLimiter = new RateLimiterService();
  });

  it("should allow first spawn action", () => {
    expect(rateLimiter.isAllowed(12345, "spawn")).toBe(true);
  });

  it("should reject spawn action immediately after hitting limit", () => {
    rateLimiter.hit(12345, "spawn");
    expect(rateLimiter.isAllowed(12345, "spawn")).toBe(false);
  });

  it("should isolate rate limits per user", () => {
    rateLimiter.hit(12345, "spawn");
    expect(rateLimiter.isAllowed(12345, "spawn")).toBe(false);
    expect(rateLimiter.isAllowed(67890, "spawn")).toBe(true);
  });

  it("should isolate rate limits between spawn and catch actions", () => {
    rateLimiter.hit(12345, "spawn");
    expect(rateLimiter.isAllowed(12345, "spawn")).toBe(false);
    expect(rateLimiter.isAllowed(12345, "catch")).toBe(true);
  });

  it("prunes stale user entries so the map cannot grow unbounded", () => {
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(1_000_000);

    for (let userId = 0; userId < MEMORY_PRUNE_INTERVAL + 10; userId += 1) {
      rateLimiter.hit(userId, "spawn");
    }
    expect(rateLimiter.trackedUserCount).toBe(MEMORY_PRUNE_INTERVAL + 10);

    // Jump past every window, then trigger another prune cycle with fresh users.
    nowSpy.mockReturnValue(1_000_000 + 10 * 60 * 1000);
    for (let userId = 5000; userId < 5000 + MEMORY_PRUNE_INTERVAL; userId += 1) {
      rateLimiter.hit(userId, "spawn");
    }

    expect(rateLimiter.trackedUserCount).toBe(MEMORY_PRUNE_INTERVAL);
    nowSpy.mockRestore();
  });
});
