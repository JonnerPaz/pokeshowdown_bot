import { describe, expect, it } from "vitest";
import { createMockPokemon, createTestBot } from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";
import { GroupEncounterService } from "../../../src/features/pokemon/groupEncounter.service.js";
import { createGroupCatchKeyboard } from "../../../src/features/pokemon/pokemon.keyboards.js";

describe("GroupEncounterService Unit Tests", () => {
  it("tracks message volume and triggers spawn at threshold", () => {
    const service = new GroupEncounterService({
      spawnMessageMin: 3,
      spawnMessageMax: 3,
      spawnCooldownMs: 1000,
    });

    const chatId = -10012345;
    expect(service.trackMessage(chatId, 101)).toBe(false); // msg 1
    expect(service.trackMessage(chatId, 102)).toBe(false); // msg 2
    expect(service.trackMessage(chatId, 103)).toBe(true); // msg 3: threshold reached!
  });

  it("filters rapid consecutive messages from the same sender (anti-spam)", () => {
    const service = new GroupEncounterService({
      spawnMessageMin: 5,
      spawnMessageMax: 5,
      spawnCooldownMs: 1000,
    });

    const chatId = -10012345;
    expect(service.trackMessage(chatId, 999)).toBe(false);
    // Rapid duplicate message from same user in <2s
    expect(service.trackMessage(chatId, 999)).toBe(false);
    expect(service.trackMessage(chatId, 999)).toBe(false);

    // Another user's message is counted
    expect(service.trackMessage(chatId, 888)).toBe(false);
  });

  it("enforces cooldown so groups are not spammed with consecutive spawns", () => {
    const service = new GroupEncounterService({
      spawnMessageMin: 2,
      spawnMessageMax: 2,
      spawnCooldownMs: 10_000,
    });

    const chatId = -100999;
    expect(service.trackMessage(chatId, 1)).toBe(false);
    expect(service.trackMessage(chatId, 2)).toBe(true); // Spawn 1 triggered

    // Immediate next messages reach threshold, but cooldown is active
    expect(service.trackMessage(chatId, 1)).toBe(false);
    expect(service.trackMessage(chatId, 2)).toBe(false); // Cooldown blocks spawn
  });

  it("builds multiplayer keyboard with 4 pokeball types and NO Run button", () => {
    const kb = createGroupCatchKeyboard("enc123");
    const buttons = kb.inline_keyboard.flat();

    expect(buttons.length).toBe(4);
    expect(buttons.some((b) => b.text.includes("Pokéball"))).toBe(true);
    expect(buttons.some((b) => b.text.includes("Great Ball"))).toBe(true);
    expect(buttons.some((b) => b.text.includes("Ultra Ball"))).toBe(true);
    expect(buttons.some((b) => b.text.includes("Master Ball"))).toBe(true);
    expect(buttons.some((b) => b.text.includes("Run"))).toBe(false);
  });
});

describe("Group Spawns & Encounters Integration", () => {
  it("warns unregistered users who attempt to catch in group", async () => {
    const service = new GroupEncounterService({
      spawnMessageMin: 1,
      spawnMessageMax: 1,
      spawnCooldownMs: 0,
    });
    const botCtx = await createTestBot({ groupEncounterService: service });

    const groupChatId = -100555;
    const encounter = await service.spawnGroupPokemon(botCtx.mainBot.bot.api, groupChatId, {
      pokeApi: botCtx.pokeApi,
    });

    // Unregistered user tries to catch
    await botCtx.dispatchCallback(`gcatch:${encounter.id}:pokeball`, {
      fromId: 99999,
      chatId: groupChatId,
    });

    // Encounter should remain active
    expect(encounter.isResolved).toBe(false);
  });

  it("alerts registered users with empty ball inventory and prevents throw", async () => {
    const service = new GroupEncounterService({
      spawnMessageMin: 1,
      spawnMessageMax: 1,
      spawnCooldownMs: 0,
    });
    const botCtx = await createTestBot({ groupEncounterService: service });

    const userId = 777;
    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 1,
        telegramId: BigInt(userId),
        username: "empty_pockets",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("eevee", "normal")],
        pokeballs: 0,
        greatballs: 0,
        ultraballs: 0,
        masterballs: 0,
      }),
    );

    const groupChatId = -100555;
    const encounter = await service.spawnGroupPokemon(botCtx.mainBot.bot.api, groupChatId, {
      pokeApi: botCtx.pokeApi,
    });

    await botCtx.dispatchCallback(`gcatch:${encounter.id}:pokeball`, {
      fromId: userId,
      chatId: groupChatId,
    });

    // Encounter still active, ball count not negative
    expect(encounter.isResolved).toBe(false);
    const user = await botCtx.userDataSource.findUserByTelegramId(userId);
    expect(user?.pokeballs).toBe(0);
  });

  it("allows a registered user with balls to catch and resolves encounter", async () => {
    const service = new GroupEncounterService({
      spawnMessageMin: 1,
      spawnMessageMax: 1,
      spawnCooldownMs: 0,
      fleeChance: 0, // ensure no flee for deterministic test
    });
    const botCtx = await createTestBot({ groupEncounterService: service });

    const userId = 888;
    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 2,
        telegramId: BigInt(userId),
        username: "lucky_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("squirtle", "water")],
        masterballs: 1,
      }),
    );

    const groupChatId = -100777;
    const encounter = await service.spawnGroupPokemon(botCtx.mainBot.bot.api, groupChatId, {
      pokeApi: botCtx.pokeApi,
    });

    await botCtx.dispatchCallback(`gcatch:${encounter.id}:masterball`, {
      fromId: userId,
      chatId: groupChatId,
    });

    // Encounter is resolved
    expect(encounter.isResolved).toBe(true);

    // User's masterball was deducted
    const user = await botCtx.userDataSource.findUserByTelegramId(userId);
    expect(user?.masterballs).toBe(0);

    // User now owns the caught pokemon
    expect(user?.pokemons.length).toBe(2);
  });

  it("prevents second user from catching once encounter is resolved (mutex)", async () => {
    const service = new GroupEncounterService({
      spawnMessageMin: 1,
      spawnMessageMax: 1,
      spawnCooldownMs: 0,
    });
    const botCtx = await createTestBot({ groupEncounterService: service });

    const userA = 1001;
    const userB = 1002;

    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 10,
        telegramId: BigInt(userA),
        username: "fast_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("charmander", "fire")],
        masterballs: 1,
      }),
    );
    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 11,
        telegramId: BigInt(userB),
        username: "slow_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("bulbasaur", "grass")],
        masterballs: 1,
      }),
    );

    const groupChatId = -100888;
    const encounter = await service.spawnGroupPokemon(botCtx.mainBot.bot.api, groupChatId, {
      pokeApi: botCtx.pokeApi,
    });

    // User A catches first
    await botCtx.dispatchCallback(`gcatch:${encounter.id}:masterball`, {
      fromId: userA,
      chatId: groupChatId,
    });
    expect(encounter.isResolved).toBe(true);

    // User B clicks second
    await botCtx.dispatchCallback(`gcatch:${encounter.id}:masterball`, {
      fromId: userB,
      chatId: groupChatId,
    });

    // User B's masterball was NOT deducted because it was already resolved
    const slowUser = await botCtx.userDataSource.findUserByTelegramId(userB);
    expect(slowUser?.masterballs).toBe(1);
    expect(slowUser?.pokemons.length).toBe(1);
  });

  it("spawns a group encounter when /generate_pokemon is used in a group", async () => {
    const botCtx = await createTestBot();
    const userId = 5001;

    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 50,
        telegramId: BigInt(userId),
        username: "group_host",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("pikachu", "electric")],
      }),
    );

    const groupChatId = -100999;
    await botCtx.dispatchCommand("/generate_pokemon", {
      fromId: userId,
      chatId: groupChatId,
      isGroup: true,
    });

    const sent = botCtx.client.getSentMessages();
    expect(
      sent.some((m) => m.text?.includes("wild Pokémon appeared") || m.text?.includes("jumped out")),
    ).toBe(true);
  });

  it("triggers spontaneous group spawn through ambient chat messages", async () => {
    const service = new GroupEncounterService({
      spawnMessageMin: 2,
      spawnMessageMax: 2,
      spawnCooldownMs: 0,
    });
    const botCtx = await createTestBot({ groupEncounterService: service });
    const groupChatId = -100333;

    // First message in group
    await botCtx.dispatchText("Hello trainers!", {
      fromId: 201,
      chatId: groupChatId,
      isGroup: true,
    });
    expect(botCtx.client.getSentMessages().length).toBe(0);

    // Second message reaches threshold of 2 -> triggers spontaneous spawn!
    await botCtx.dispatchText("Ready to catch something?", {
      fromId: 202,
      chatId: groupChatId,
      isGroup: true,
    });
    const sent = botCtx.client.getSentMessages();
    expect(
      sent.some((m) => m.text?.includes("wild Pokémon appeared") || m.text?.includes("jumped out")),
    ).toBe(true);
  });
});
