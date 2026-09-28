import { describe, expect, it } from "vitest";
import { createTestBot } from "./harness/testHarness.js";

describe("Integration Test Harness (ApiClientOptions)", () => {
  it("initializes MainBot with mocked Telegram API client and registers commands", async () => {
    const { client } = await createTestBot();

    expect(client).toBeDefined();
    // Verify client captured no leftover errors
    expect(client.getCalls()).toHaveLength(0);
  });

  it("captures bot replies when dispatching /help command", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/help", { isGroup: true });

    const sent = client.getSentMessages();
    expect(sent.length).toBeGreaterThanOrEqual(1);

    const helpMsg = sent.find((m) => m.text?.includes("commands"));
    expect(helpMsg).toBeDefined();
    expect(helpMsg?.text).toContain("/battle");
  });

  it("captures localized /start responses without internet connection", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/start", { isGroup: true, username: "red" });

    const sent = client.getSentMessages();
    expect(sent.length).toBeGreaterThanOrEqual(1);
    expect(sent[0]?.text).toContain("Welcome to PokeBotShowdown");
  });
});
