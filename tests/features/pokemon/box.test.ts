import { describe, it, expect, beforeEach } from "vitest";
import {
  createTestBot,
  type TestBotContext,
  createMockPokemon,
} from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";

describe("PC Storage Box Feature (/box, deposit, withdraw, swap)", () => {
  let bot: TestBotContext;

  beforeEach(async () => {
    bot = await createTestBot();
  });

  it("informs user when /box is called but storage box is empty", async () => {
    const userId = 901;
    bot.userDataSource.seedUser(
      new UserEntity({
        id: 1,
        telegramId: BigInt(userId),
        username: "ash_ketchum",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("pikachu", "electric", { id: 1, isInParty: true })],
      }),
    );

    await bot.dispatchCommand("/box", { fromId: userId });

    const sent = bot.client.getSentMessages();
    expect(sent.length).toBe(1);
    expect(sent[0]?.text).toContain("Your PC Storage Box is empty");
    expect(sent[0]?.text).toContain("6/6");
  });

  it("renders storage box carousel when user has boxed pokemon", async () => {
    const userId = 902;
    const p1 = createMockPokemon("pikachu", "electric", { id: 1, isInParty: true });
    const p2 = createMockPokemon("snorlax", "normal", { id: 2, isInParty: false });
    const p3 = createMockPokemon("gengar", "ghost", { id: 3, isInParty: false });

    bot.userDataSource.seedUser(
      new UserEntity({
        id: 2,
        telegramId: BigInt(userId),
        username: "box_master",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1, p2, p3],
      }),
    );

    await bot.dispatchCommand("/box", { fromId: userId });

    const photoCalls = bot.client.getCalls("sendPhoto");
    expect(photoCalls.length).toBe(1);
    const caption = photoCalls[0]?.payload?.caption;
    expect(caption).toContain("Your PC Storage Box");
    expect(caption).toContain("Snorlax");
    expect(caption).toContain("Stored in Box");
  });

  it("automatically routes 7th caught Pokemon to PC Storage Box when party has 6", async () => {
    const userId = 903;
    const party = [
      createMockPokemon("bulbasaur", "grass", { id: 10, isInParty: true }),
      createMockPokemon("charmander", "fire", { id: 11, isInParty: true }),
      createMockPokemon("squirtle", "water", { id: 12, isInParty: true }),
      createMockPokemon("caterpie", "bug", { id: 13, isInParty: true }),
      createMockPokemon("weedle", "bug", { id: 14, isInParty: true }),
      createMockPokemon("pidgey", "flying", { id: 15, isInParty: true }),
    ];

    bot.userDataSource.seedUser(
      new UserEntity({
        id: 3,
        telegramId: BigInt(userId),
        username: "full_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: party,
        pokeballs: 10,
      }),
    );

    // Trigger wild spawn (defaultPokeApi spawns pikachu)
    const spawnPromise = bot.dispatchCommand("/generate_pokemon", { fromId: userId });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Throw ball
    await bot.dispatchCallback("catch", { fromId: userId });
    await spawnPromise;

    const refreshed = await bot.userDataSource.findUserByTelegramId(userId);
    expect(refreshed?.pokemons.length).toBe(7);
    expect(refreshed?.party.length).toBe(6);
    expect(refreshed?.box.length).toBe(1);

    const boxed = refreshed?.box[0];
    expect(boxed?.name).toBe("pikachu");
    expect(boxed?.isInParty).toBe(false);

    const sent = bot.client.getSentMessages();
    expect(
      sent.some((m) => m.text?.includes("PC Storage Box") && m.text?.includes("party is full")),
    ).toBe(true);
  });

  it("allows depositing a party Pokemon to the storage box", async () => {
    const userId = 904;
    const p1 = createMockPokemon("charizard", "fire", { id: 20, isInParty: true });
    const p2 = createMockPokemon("blastoise", "water", { id: 21, isInParty: true });

    bot.userDataSource.seedUser(
      new UserEntity({
        id: 4,
        telegramId: BigInt(userId),
        username: "depositor",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1, p2],
      }),
    );

    // Deposit Charizard
    await bot.dispatchCallback(`pkmn:deposit:20:${userId}`, { fromId: userId });

    const refreshed = await bot.userDataSource.findUserByTelegramId(userId);
    expect(refreshed?.party.length).toBe(1);
    expect(refreshed?.box.length).toBe(1);
    expect(refreshed?.box[0]?.id).toBe(20);
    expect(refreshed?.party[0]?.id).toBe(21);
  });

  it("prevents depositing the last remaining party Pokemon", async () => {
    const userId = 905;
    const p1 = createMockPokemon("mew", "psychic", { id: 30, isInParty: true });

    bot.userDataSource.seedUser(
      new UserEntity({
        id: 5,
        telegramId: BigInt(userId),
        username: "lone_trainer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1],
      }),
    );

    await bot.dispatchCallback(`pkmn:deposit:30:${userId}`, { fromId: userId });

    const answerCalls = bot.client.getCalls("answerCallbackQuery");
    const lastAnswer = answerCalls[answerCalls.length - 1];
    expect(lastAnswer?.payload?.text).toContain("cannot deposit your last party Pokémon");

    const refreshed = await bot.userDataSource.findUserByTelegramId(userId);
    expect(refreshed?.party.length).toBe(1);
    expect(refreshed?.box.length).toBe(0);
  });

  it("allows withdrawing a boxed Pokemon into the party when party has room", async () => {
    const userId = 906;
    const p1 = createMockPokemon("raichu", "electric", { id: 40, isInParty: true });
    const p2 = createMockPokemon("arcanine", "fire", { id: 41, isInParty: false });

    bot.userDataSource.seedUser(
      new UserEntity({
        id: 6,
        telegramId: BigInt(userId),
        username: "withdrawer",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1, p2],
      }),
    );

    await bot.dispatchCallback(`pkmn:withdraw:41:${userId}`, { fromId: userId });

    const refreshed = await bot.userDataSource.findUserByTelegramId(userId);
    expect(refreshed?.party.length).toBe(2);
    expect(refreshed?.box.length).toBe(0);
    expect(refreshed?.party.some((p) => p.id === 41)).toBe(true);
  });

  it("allows swapping a boxed Pokemon with a full party member", async () => {
    const userId = 907;
    const party = [
      createMockPokemon("p1", "normal", { id: 51, isInParty: true }),
      createMockPokemon("p2", "normal", { id: 52, isInParty: true }),
      createMockPokemon("p3", "normal", { id: 53, isInParty: true }),
      createMockPokemon("p4", "normal", { id: 54, isInParty: true }),
      createMockPokemon("p5", "normal", { id: 55, isInParty: true }),
      createMockPokemon("p6", "normal", { id: 56, isInParty: true }),
    ];
    const boxed = createMockPokemon("dragonite", "dragon", { id: 99, isInParty: false });

    bot.userDataSource.seedUser(
      new UserEntity({
        id: 7,
        telegramId: BigInt(userId),
        username: "swapper",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [...party, boxed],
      }),
    );

    // 1. Pick swap opens party selection
    await bot.dispatchCallback(`pkmn:swap:pick:99:${userId}`, { fromId: userId });
    const captionCalls = bot.client.getCalls("editMessageCaption");
    expect(captionCalls.length).toBeGreaterThan(0);
    expect(captionCalls[0]?.payload?.caption).toContain("Swap Pokémon with Battle Party");

    // 2. Perform swap: Boxed Dragonite (99) with Party p1 (51)
    await bot.dispatchCallback(`pkmn:swap:do:99:51:${userId}`, { fromId: userId });

    const refreshed = await bot.userDataSource.findUserByTelegramId(userId);
    expect(refreshed?.party.length).toBe(6);
    expect(refreshed?.box.length).toBe(1);

    expect(refreshed?.party.some((p) => p.id === 99)).toBe(true);
    expect(refreshed?.box.some((p) => p.id === 51)).toBe(true);
  });

  it("warns user when /release is used with only 1 pokemon", async () => {
    const userId = 908;
    const p1 = createMockPokemon("starter", "grass", { id: 60 });
    bot.userDataSource.seedUser(
      new UserEntity({
        id: 8,
        telegramId: BigInt(userId),
        username: "lone_trainer2",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1],
      }),
    );

    await bot.dispatchCommand("/release", { fromId: userId });
    const sent = bot.client.getSentMessages();
    expect(sent.length).toBe(1);
    expect(sent[0]?.text).toContain("cannot release your only Pokémon");
  });

  it("shows release selection keyboard on /release command", async () => {
    const userId = 909;
    const p1 = createMockPokemon("charizard", "fire", { id: 70 });
    const p2 = createMockPokemon("pidgey", "flying", { id: 71 });
    bot.userDataSource.seedUser(
      new UserEntity({
        id: 9,
        telegramId: BigInt(userId),
        username: "releaser",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1, p2],
      }),
    );

    await bot.dispatchCommand("/release", { fromId: userId });
    const sent = bot.client.getSentMessages();
    expect(sent.length).toBe(1);
    expect(sent[0]?.text).toContain("Release Pokémon into the Wild");
    expect(sent[0]?.reply_markup).toBeDefined();
  });

  it("executes release, deletes pokemon, rewards +3 Pokeballs, and clears buddy if needed", async () => {
    const userId = 910;
    const p1 = createMockPokemon("pikachu", "electric", { id: 80 });
    const p2 = createMockPokemon("rattata", "normal", { id: 81 });

    bot.userDataSource.seedUser(
      new UserEntity({
        id: 10,
        telegramId: BigInt(userId),
        username: "oak_researcher",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1, p2],
        pokeballs: 5,
        buddyPokemonId: 81, // Rattata is active buddy
      }),
    );

    // 1. Ask for release
    await bot.dispatchCallback(`pkmn:rel:ask:81:0:party:${userId}`, { fromId: userId });
    const captionCalls = bot.client.getCalls("editMessageCaption");
    expect(captionCalls.length).toBeGreaterThan(0);
    expect(captionCalls[0]?.payload?.caption).toContain("Release Pokémon Confirmation");
    expect(captionCalls[0]?.payload?.caption).toContain("+3 🔴 Pokéballs");

    // 2. Confirm release
    await bot.dispatchCallback(`pkmn:rel:do:81:0:party:${userId}`, { fromId: userId });

    const refreshed = await bot.userDataSource.findUserByTelegramId(userId);
    expect(refreshed?.pokemons.length).toBe(1);
    expect(refreshed?.pokemons[0]?.id).toBe(80);
    expect(refreshed?.pokeballs).toBe(8); // 5 + 3
    expect(refreshed?.buddyPokemonId).toBeNull(); // Cleared because Rattata was released
  });

  it("rewards extra Pokeballs and Great Ball when releasing a shiny Pokemon", async () => {
    const userId = 911;
    const p1 = createMockPokemon("normal_mon", "normal", { id: 91 });
    const shiny = createMockPokemon("shiny_charizard", "fire", { id: 92, isShiny: true });

    bot.userDataSource.seedUser(
      new UserEntity({
        id: 11,
        telegramId: BigInt(userId),
        username: "shiny_releaser",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [p1, shiny],
        pokeballs: 2,
        greatballs: 0,
      }),
    );

    await bot.dispatchCallback(`pkmn:rel:do:92:0:party:${userId}`, { fromId: userId });

    const refreshed = await bot.userDataSource.findUserByTelegramId(userId);
    expect(refreshed?.pokemons.length).toBe(1);
    expect(refreshed?.pokeballs).toBe(7); // 2 + 5
    expect(refreshed?.greatballs).toBe(1); // 0 + 1
  });
});
