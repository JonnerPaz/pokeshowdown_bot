import { describe, expect, it } from "vitest";

import { UserEntity } from "../../../src/domain/entities/users.entity.js";
import { formatArenaBattleResult } from "../../../src/features/battle/battle.feature.js";
import type { ArenaRoom } from "../../../src/features/arena/arena.types.js";
import { createTestArena } from "../../harness/arena.js";
import { createMockPokemon, createTestBot } from "../../harness/testHarness.js";

describe("Battle Feature /battle command", () => {
  it("replies that the arena is unavailable when webAppUrl is not set", async () => {
    const harness = await createTestBot();
    await harness.dispatchCommand("/battle");

    const sent = harness.client.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain("The Battle Arena is not available right now.");
  });

  it("requires the user to be registered", async () => {
    const arena = createTestArena();
    const harness = await createTestBot({
      arena,
      webAppUrl: "https://arena.example.com",
    });

    await harness.dispatchCommand("/battle", { fromId: 999 });

    const sent = harness.client.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain("You are not registered! Use /register first.");
  });

  it("rejects a registered user with an empty active party", async () => {
    const arena = createTestArena();
    const harness = await createTestBot({
      arena,
      webAppUrl: "https://arena.example.com",
    });

    const user = new UserEntity({
      id: 1,
      telegramId: 100,
      username: "ash",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [],
    });
    harness.userDataSource.seedUser(user);

    await harness.dispatchCommand("/battle", { fromId: 100 });

    const sent = harness.client.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain("Move at least one Pokémon to your active party");
  });

  it("opens an Arena room with a web_app button in a private chat", async () => {
    const arena = createTestArena();
    const harness = await createTestBot({
      arena,
      webAppUrl: "https://arena.example.com",
    });

    const user = new UserEntity({
      id: 1,
      telegramId: 100,
      username: "ash",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [createMockPokemon("pikachu", "electric", { id: 10, isInParty: true })],
    });
    harness.userDataSource.seedUser(user);

    await harness.dispatchCommand("/battle", { fromId: 100, isGroup: false });

    const sent = harness.client.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain("opened a Battle Arena room");
    const markup = sent[0]?.reply_markup as {
      inline_keyboard: Array<Array<{ url?: string; web_app?: { url: string } }>>;
    };
    expect(markup?.inline_keyboard[0]?.[0]?.web_app?.url).toMatch(
      /^https:\/\/arena\.example\.com\?room=[A-Z0-9]{6}$/,
    );
  });

  it("opens an Arena room with a startapp deep-link URL button in a group chat", async () => {
    const arena = createTestArena();
    const harness = await createTestBot({
      arena,
      webAppUrl: "https://arena.example.com",
    });

    const user = new UserEntity({
      id: 1,
      telegramId: 100,
      username: "ash",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [createMockPokemon("pikachu", "electric", { id: 10, isInParty: true })],
    });
    harness.userDataSource.seedUser(user);

    await harness.dispatchCommand("/battle", {
      fromId: 100,
      chatId: -100123456,
      isGroup: true,
    });

    const sent = harness.client.getSentMessages();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.text).toContain("opened a Battle Arena room");
    const markup = sent[0]?.reply_markup as {
      inline_keyboard: Array<Array<{ url?: string; web_app?: { url: string } }>>;
    };
    expect(markup?.inline_keyboard[0]?.[0]?.url).toMatch(
      /^https:\/\/t\.me\/pokeshowdown_bot\?startapp=[A-Z0-9]{6}$/,
    );
  });

  it("informs the trainer if they already have an active room", async () => {
    const arena = createTestArena();
    const harness = await createTestBot({
      arena,
      webAppUrl: "https://arena.example.com",
    });

    const user = new UserEntity({
      id: 1,
      telegramId: 100,
      username: "ash",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [createMockPokemon("pikachu", "electric", { id: 10, isInParty: true })],
    });
    harness.userDataSource.seedUser(user);

    await harness.dispatchCommand("/battle", { fromId: 100, isGroup: false });
    await harness.dispatchCommand("/battle", { fromId: 100, isGroup: false });

    const sent = harness.client.getSentMessages();
    expect(sent).toHaveLength(2);
    expect(sent[1]?.text).toContain("already in an active Battle Arena room");
  });

  it("formats battle results accurately for different end reasons", () => {
    const fakeRoom = (overrides: Record<string, unknown> = {}) =>
      ({
        code: "ABC123",
        winnerTelegramId: 1,
        finishReason: "knockout",
        state: {
          trainerA: {
            id: 1,
            telegramId: 1,
            name: "Ash",
            pokemon: { name: "Pikachu" },
          },
          trainerB: {
            id: 2,
            telegramId: 2,
            name: "Gary",
            pokemon: { name: "Eevee" },
          },
        },
        ...overrides,
      }) as unknown as ArenaRoom;

    expect(formatArenaBattleResult(fakeRoom())).toContain("Ash* (Pikachu) defeated *Gary* (Eevee)");
    expect(formatArenaBattleResult(fakeRoom({ finishReason: "forfeit" }))).toContain(
      "by forfeit in Arena `#ABC123`",
    );
    expect(formatArenaBattleResult(fakeRoom({ finishReason: "abandoned" }))).toContain(
      "by abandonment in Arena `#ABC123`",
    );
    expect(formatArenaBattleResult(fakeRoom({ winnerTelegramId: null }))).toContain(
      "ended in a draw",
    );
  });
});
