import { describe, it, expect, vi } from "vitest";
import { Bot } from "grammy";
import { autoRetry } from "@grammyjs/auto-retry";

describe("Auto-Retry Plugin Integration", () => {
  it("automatically retries on 429 Too Many Requests and succeeds on second attempt", async () => {
    let callCount = 0;
    const mockFetch: typeof fetch = vi.fn(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify({
            ok: false,
            error_code: 429,
            description: "Too Many Requests: retry after 0.05",
            parameters: { retry_after: 0.05 },
          }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          ok: true,
          result: {
            message_id: 999,
            date: Math.floor(Date.now() / 1000),
            chat: { id: 12345, type: "private" },
            text: "Success after retry!",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const bot = new Bot("mock_token", {
      client: {
        fetch: mockFetch,
      },
    });

    bot.api.config.use(
      autoRetry({
        maxRetryAttempts: 2,
        maxDelaySeconds: 5,
      }),
    );

    const result = await bot.api.sendMessage(12345, "Test retry");
    expect(result.message_id).toBe(999);
    expect(callCount).toBe(2);
  });

  it("fails and throws when max retry attempts are exhausted", async () => {
    let callCount = 0;
    const mockFetch: typeof fetch = vi.fn(async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          ok: false,
          error_code: 429,
          description: "Persistent rate limit",
          parameters: { retry_after: 0.05 },
        }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    });

    const bot = new Bot("mock_token", {
      client: {
        fetch: mockFetch,
      },
    });

    bot.api.config.use(
      autoRetry({
        maxRetryAttempts: 1,
        maxDelaySeconds: 5,
      }),
    );

    await expect(bot.api.sendMessage(12345, "Should fail")).rejects.toThrow();
    // 1 initial attempt + 1 retry = 2 calls
    expect(callCount).toBe(2);
  });
});
