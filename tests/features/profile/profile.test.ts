import { beforeEach, describe, expect, it } from "vitest";
import {
  createMockPokemon,
  createTestBot,
  type TestBotContext,
} from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";
import {
  calculateWinRate,
  findPokemonForBuddy,
  formatLeaderboard,
  formatProfileCard,
  getTrainerRankTitle,
} from "../../../src/features/profile/profile.service.js";

describe("Profile & Leaderboard Service Unit Tests", () => {
  it("computes trainer rank titles based on battle victories", () => {
    expect(getTrainerRankTitle(0)).toBe("🥉 Rookie Trainer");
    expect(getTrainerRankTitle(2)).toBe("🥉 Rookie Trainer");
    expect(getTrainerRankTitle(3)).toBe("🥈 Gym Challenger");
    expect(getTrainerRankTitle(9)).toBe("🥈 Gym Challenger");
    expect(getTrainerRankTitle(10)).toBe("🥇 Ace Trainer");
    expect(getTrainerRankTitle(24)).toBe("🥇 Ace Trainer");
    expect(getTrainerRankTitle(25)).toBe("⭐ Pokémon Master");
    expect(getTrainerRankTitle(49)).toBe("⭐ Pokémon Master");
    expect(getTrainerRankTitle(50)).toBe("👑 Champion");
    expect(getTrainerRankTitle(100)).toBe("👑 Champion");
  });

  it("calculates battle win rates accurately with rounding", () => {
    expect(calculateWinRate(0, 0)).toBe(0);
    expect(calculateWinRate(10, 0)).toBe(100);
    expect(calculateWinRate(0, 5)).toBe(0);
    expect(calculateWinRate(3, 1)).toBe(75.0);
    expect(calculateWinRate(1, 2)).toBe(33.3);
  });

  it("formats profile card with buddy and collection stats", () => {
    const charizard = createMockPokemon("charizard", "fire", { id: 10, timesCaught: 3 });
    const user = new UserEntity({
      id: 1,
      telegramId: 100,
      username: "red_kanto",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [charizard],
      wins: 15,
      losses: 5,
      buddyPokemonId: 10,
    });

    const card = formatProfileCard(user);
    expect(card.text).toContain("🪪 *Trainer Card* — @red_kanto");
    expect(card.text).toContain("🥇 Ace Trainer");
    expect(card.text).toContain("Record: 15W - 5L");
    expect(card.text).toContain("Win Rate: 75%");
    expect(card.text).toContain("charizard");
    expect(card.spriteUrl).toBeDefined();
  });

  it("formats leaderboard with medal icons and user rank", () => {
    const u1 = new UserEntity({
      id: 1,
      telegramId: 111,
      username: "ash",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [createMockPokemon("pikachu", "electric")],
      wins: 20,
      losses: 2,
    });
    const u2 = new UserEntity({
      id: 2,
      telegramId: 222,
      username: "gary",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [createMockPokemon("blastoise", "water")],
      wins: 12,
      losses: 5,
    });

    const board = formatLeaderboard([u1, u2], 222);
    expect(board).toContain("🥇 *@ash* — 20W / 2L (90.9% WR)");
    expect(board).toContain("🥈 *@gary* — 12W / 5L (70.6% WR)");
    expect(board).toContain("Your Position:* #2 (@gary)");
  });

  it("matches buddy pokemon by name or nickname", () => {
    const p1 = createMockPokemon("pikachu", "electric", { id: 1, nickname: "Sparky" });
    const p2 = createMockPokemon("snorlax", "normal", { id: 2 });
    const user = new UserEntity({
      id: 1,
      telegramId: 100,
      username: "ash",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [p1, p2],
    });

    const matchName = findPokemonForBuddy(user, "snorlax");
    expect("found" in matchName && matchName.found.id).toBe(2);

    const matchNick = findPokemonForBuddy(user, "sparky");
    expect("found" in matchNick && matchNick.found.id).toBe(1);

    const matchMissing = findPokemonForBuddy(user, "mewtwo");
    expect("error" in matchMissing).toBe(true);
  });
});

describe("Profile & Leaderboard Bot Commands Integration", () => {
  let botCtx: TestBotContext;

  beforeEach(async () => {
    botCtx = await createTestBot();
  });

  it("/profile warns unregistered users", async () => {
    await botCtx.dispatchCommand("/profile", { fromId: 901 });
    const sent = botCtx.client.getSentMessages();
    expect(sent[0]?.text).toContain("You are not registered");
  });

  it("/profile renders trainer card with buddy sprite and win rate", async () => {
    const squirtle = createMockPokemon("squirtle", "water", { id: 50 });
    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 1,
        telegramId: 902,
        username: "blue_oak",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [squirtle],
        wins: 4,
        losses: 1,
        buddyPokemonId: 50,
      }),
    );

    await botCtx.dispatchCommand("/profile", { fromId: 902, username: "blue_oak" });
    const sent = botCtx.client.getSentMessages();
    expect(sent.length).toBe(1);
    expect(sent[0]?.text).toContain("🪪 *Trainer Card* — @blue_oak");
    expect(sent[0]?.text).toContain("Gym Challenger");
    expect(sent[0]?.text).toContain("80%");
    expect(sent[0]?.text).toContain("squirtle");
  });

  it("/leaderboard reports empty status when no battles have occurred", async () => {
    await botCtx.dispatchCommand("/leaderboard", { fromId: 903 });
    const sent = botCtx.client.getSentMessages();
    expect(sent[0]?.text).toContain("No battles recorded yet!");
  });

  it("/leaderboard ranks top trainers by battle wins", async () => {
    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 1,
        telegramId: 910,
        username: "champion_cynthia",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("garchomp", "dragon")],
        wins: 55,
        losses: 2,
      }),
    );
    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 2,
        telegramId: 911,
        username: "challenger_paul",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [createMockPokemon("electivire", "electric")],
        wins: 10,
        losses: 8,
      }),
    );

    await botCtx.dispatchCommand("/leaderboard", { fromId: 911 });
    const sent = botCtx.client.getSentMessages();
    expect(sent[0]?.text).toContain("🥇 *@champion_cynthia* — 55W / 2L");
    expect(sent[0]?.text).toContain("🥈 *@challenger_paul* — 10W / 8L");
    expect(sent[0]?.text).toContain("Your Position:* #2");
  });

  it("/buddy inspects current buddy and sets new buddy pokemon", async () => {
    const bulbasaur = createMockPokemon("bulbasaur", "grass", { id: 71 });
    const charmander = createMockPokemon("charmander", "fire", { id: 72 });
    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 1,
        telegramId: 920,
        username: "trainer_steve",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [bulbasaur, charmander],
        buddyPokemonId: 71,
      }),
    );

    // 1. Inspect without args
    await botCtx.dispatchCommand("/buddy", { fromId: 920 });
    let sent = botCtx.client.getSentMessages();
    expect(sent[0]?.text).toContain("Your current buddy:* bulbasaur");

    // 2. Try non-existent pokemon
    botCtx.client.clear();
    await botCtx.dispatchText("/buddy zapdos", { fromId: 920 });
    sent = botCtx.client.getSentMessages();
    expect(sent[0]?.text).toContain('don\'t own any Pokémon named "zapdos"');

    // 3. Set charmander as buddy
    botCtx.client.clear();
    await botCtx.dispatchText("/buddy charmander", { fromId: 920 });
    sent = botCtx.client.getSentMessages();
    expect(sent[0]?.text).toContain("set *charmander* as your buddy");

    const updatedUser = await botCtx.userDataSource.findUserByTelegramId(920);
    expect(updatedUser?.buddyPokemonId).toBe(72);
  });
});
