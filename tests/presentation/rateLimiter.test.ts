import { describe, it, expect, beforeEach } from "vitest";
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
});
