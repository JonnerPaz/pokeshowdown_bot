import type { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { Bot } from "grammy";
import type { AppContext } from "../../src/presentation/data/types.js";
import { Server } from "../../src/presentation/server.js";
import { MockTelegramClient } from "../harness/mockTelegramClient.js";

describe("Server", () => {
  let server: Server | undefined;

  afterEach(async () => {
    if (server) {
      await server.close();
      server = undefined;
    }
  });

  it("serves GET /health with status 200 and registers telegram webhook", async () => {
    const mockClient = new MockTelegramClient();
    const bot = new Bot<AppContext>("mock-token", {
      client: {
        apiRoot: "https://api.telegram.org",
        fetch: mockClient.createFetch(),
      },
    });

    server = new Server({
      port: 0,
      bot,
      webhookUrl: "https://example.com/webhook",
      webhookSecret: "super-secret-token",
    });

    await server.setup();

    const address = server.httpServer?.address() as AddressInfo;
    expect(address).toBeDefined();
    expect(address.port).toBeGreaterThan(0);

    const res = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(res.status).toBe(200);

    const body = (await res.json()) as { status: string };
    expect(body).toEqual({ status: "ok" });

    const setWebhookCall = mockClient.getCalls().find((call) => call.method === "setWebhook");
    expect(setWebhookCall).toBeDefined();
    expect(setWebhookCall?.payload).toMatchObject({
      url: "https://example.com/webhook",
      secret_token: "super-secret-token",
    });
  });
});
