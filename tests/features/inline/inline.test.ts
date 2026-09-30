import { describe, it, expect, beforeEach } from "vitest";
import {
  createTestBot,
  type TestBotContext,
  createMockPokemon,
} from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";

describe("Inline Queries Feature", () => {
  let bot: TestBotContext;

  beforeEach(async () => {
    bot = await createTestBot();
  });

  it("handles empty inline query with guide and quick action cards", async () => {
    await bot.dispatchInlineQuery("", { fromId: 1001, username: "Red" });

    const call = bot.client.getLastCall("answerInlineQuery");
    expect(call).toBeDefined();

    const results = call?.payload.results as Array<{ id: string; title: string }>;
    expect(results).toBeDefined();
    expect(results.length).toBeGreaterThan(0);

    const hasGuide = results.some((r) => r.id === "guide_search");
    expect(hasGuide).toBe(true);
  });

  it("handles Pokémon name lookup and returns Pokédex card with photo and stats", async () => {
    await bot.dispatchInlineQuery("pikachu", { fromId: 1001 });

    const call = bot.client.getLastCall("answerInlineQuery");
    expect(call).toBeDefined();

    const results = call?.payload.results as Array<{
      id: string;
      type: string;
      title: string;
      caption?: string;
    }>;
    expect(results).toBeDefined();
    expect(results.length).toBe(1);

    const entry = results[0];
    expect(entry).toBeDefined();
    expect(entry!.type).toBe("photo");
    expect(entry!.title).toContain("Pikachu");
    expect(entry!.caption).toContain("Pokédex Entry #25");
    expect(entry!.caption).toContain("Base Stats:");
  });

  it("handles unregistered user buddy query gracefully", async () => {
    await bot.dispatchInlineQuery("buddy", { fromId: 99999, username: "GhostTrainer" });

    const call = bot.client.getLastCall("answerInlineQuery");
    expect(call).toBeDefined();

    const results = call?.payload.results as Array<{ id: string; title: string }>;
    expect(results[0]?.id).toBe("unregistered_buddy");
    expect(results[0]?.title).toContain("not registered");
  });

  it("handles registered user with no buddy selected", async () => {
    const user = new UserEntity({
      id: 1,
      telegramId: 1002n,
      username: "Blue",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [createMockPokemon("squirtle", "water", { id: 10 })],
      buddyPokemonId: null,
    });
    bot.userDataSource.seedUser(user);

    await bot.dispatchInlineQuery("buddy", { fromId: 1002, username: "Blue" });

    const call = bot.client.getLastCall("answerInlineQuery");
    expect(call).toBeDefined();

    const results = call?.payload.results as Array<{ id: string; title: string }>;
    expect(results[0]?.id).toBe("no_buddy");
    expect(results[0]?.title).toContain("No Companion Buddy");
  });

  it("handles registered user with active companion buddy", async () => {
    const buddyPokemon = createMockPokemon("charizard", "fire", {
      id: 20,
      timesCaught: 5,
      nickname: "Flamez",
      isShiny: true,
    });
    const user = new UserEntity({
      id: 2,
      telegramId: 1003n,
      username: "Ash",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [buddyPokemon],
      buddyPokemonId: 20,
      wins: 10,
      losses: 2,
    });
    bot.userDataSource.seedUser(user);

    await bot.dispatchInlineQuery("buddy", { fromId: 1003, username: "Ash" });

    const call = bot.client.getLastCall("answerInlineQuery");
    expect(call).toBeDefined();

    const results = call?.payload.results as Array<{
      id: string;
      type: string;
      title: string;
      caption?: string;
    }>;
    expect(results[0]?.type).toBe("photo");
    expect(results[0]?.title).toContain("Flamez");
    expect(results[0]?.caption).toContain("Ash's Companion Buddy");
    expect(results[0]?.caption).toContain("Wins: `10`");
    expect(results[0]?.caption).toContain("✨");
  });

  it("handles team query and returns party roster", async () => {
    const p1 = createMockPokemon("turtwig", "grass", { id: 1 });
    const p2 = createMockPokemon("starly", "flying", { id: 2 });
    const user = new UserEntity({
      id: 3,
      telegramId: 1004n,
      username: "Dawn",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [p1, p2],
    });
    bot.userDataSource.seedUser(user);

    await bot.dispatchInlineQuery("team", { fromId: 1004, username: "Dawn" });

    const call = bot.client.getLastCall("answerInlineQuery");
    expect(call).toBeDefined();

    const results = call?.payload.results as Array<{
      id: string;
      type: string;
      title: string;
      input_message_content?: { message_text: string };
    }>;
    expect(results[0]?.title).toContain("Dawn's Pokémon Party");
    expect(results[0]?.input_message_content?.message_text).toContain("Turtwig");
    expect(results[0]?.input_message_content?.message_text).toContain("Starly");
  });

  it("returns not found message when searching for non-existent pokemon", async () => {
    await bot.dispatchInlineQuery("unknown_fakemon", { fromId: 1001 });

    const call = bot.client.getLastCall("answerInlineQuery");
    expect(call).toBeDefined();

    const results = call?.payload.results as Array<{ id: string; title: string }>;
    expect(results[0]?.id).toBe("not_found");
    expect(results[0]?.title).toContain("No Pokémon found");
  });
});
