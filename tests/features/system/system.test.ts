import { describe, expect, it } from "vitest";
import { createTestBot } from "../../harness/testHarness.js";

describe("System Commands Integration (/start, /help)", () => {
  it("responds to /start and /comenzar with welcome message", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/start", { fromId: 101, username: "ash" });
    const messagesAfterStart = client.getSentMessages();
    expect(messagesAfterStart.length).toBeGreaterThanOrEqual(1);
    expect(messagesAfterStart[0]?.text).toContain("Welcome to PokeBotShowdown");

    client.clear();

    await dispatchCommand("/comenzar", { fromId: 102, username: "gary" });
    const messagesAfterComenzar = client.getSentMessages();
    expect(messagesAfterComenzar.length).toBeGreaterThanOrEqual(1);
    expect(messagesAfterComenzar[0]?.text).toContain("Welcome to PokeBotShowdown");
  });

  it("responds to /help and /ayuda with all registered commands", async () => {
    const { dispatchCommand, client } = await createTestBot();

    await dispatchCommand("/help", { fromId: 201 });
    const messages = client.getSentMessages();
    expect(messages.length).toBeGreaterThanOrEqual(1);

    const helpText = messages[0]?.text ?? "";
    expect(helpText).toContain("/start");
    expect(helpText).toContain("/register");
    expect(helpText).toContain("/battle");
    expect(helpText).toContain("/pokemons");
    expect(helpText).toContain("/evolve");
  });

  it("handles commands in both private chats and group chats", async () => {
    const { dispatchCommand, client } = await createTestBot();

    // Group chat command (chatId < 0)
    await dispatchCommand("/help", { fromId: 301, chatId: -10055555, isGroup: true });
    expect(client.getSentMessages().some((m) => m.chatId === -10055555)).toBe(true);

    client.clear();

    // Private chat command (chatId === fromId > 0)
    await dispatchCommand("/help", { fromId: 302, chatId: 302, isGroup: false });
    expect(client.getSentMessages().some((m) => m.chatId === 302)).toBe(true);
  });
});
