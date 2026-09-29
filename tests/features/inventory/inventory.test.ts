import { beforeEach, describe, expect, it } from "vitest";
import { createTestBot, type TestBotContext } from "../../harness/testHarness.js";
import { UserEntity } from "../../../src/domain/entities/users.entity.js";
import {
  calculateDailyRewards,
  DAILY_COOLDOWN_MS,
  formatBagMessage,
  processDailyClaim,
  STREAK_EXPIRY_MS,
} from "../../../src/features/inventory/inventory.service.js";

describe("Inventory Service Unit Tests", () => {
  it("calculates basic and milestone streak rewards correctly", () => {
    // Normal day: 5 Poké, 2 Great
    const day1 = calculateDailyRewards(1);
    expect(day1).toEqual({ pokeballs: 5, greatballs: 2, ultraballs: 0, masterballs: 0 });

    // Day 3 milestone: +1 Ultra Ball
    const day3 = calculateDailyRewards(3);
    expect(day3.ultraballs).toBe(1);
    expect(day3.masterballs).toBe(0);

    // Day 7 milestone: +2 Ultra Balls
    const day7 = calculateDailyRewards(7);
    expect(day7.ultraballs).toBe(2);

    // Day 14 milestone: +1 Master Ball
    const day14 = calculateDailyRewards(14);
    expect(day14.ultraballs).toBe(2); // divisible by 7 and 14
    expect(day14.masterballs).toBe(1);
  });

  it("handles daily claim progression, cooldowns, and streak expiration", () => {
    const user = new UserEntity({
      id: 1,
      telegramId: 100,
      username: "red",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [],
      pokeballs: 10,
      greatballs: 2,
      ultraballs: 0,
      masterballs: 0,
      lastDailyAt: null,
      dailyStreak: 0,
    });

    const now = new Date("2026-09-29T12:00:00Z");
    const claim1 = processDailyClaim(user, now);
    expect(claim1.claimed).toBe(true);
    if (!claim1.claimed) return;
    expect(claim1.newStreak).toBe(1);
    expect(claim1.updatedFields.pokeballs).toBe(15);
    expect(claim1.updatedFields.greatballs).toBe(4);

    // Update user state
    user.pokeballs = claim1.updatedFields.pokeballs!;
    user.greatballs = claim1.updatedFields.greatballs!;
    user.lastDailyAt = claim1.updatedFields.lastDailyAt!;
    user.dailyStreak = claim1.newStreak;

    // Try claiming 2 hours later (should fail cooldown)
    const tooSoon = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const claimTooSoon = processDailyClaim(user, tooSoon);
    expect(claimTooSoon.claimed).toBe(false);
    if (claimTooSoon.claimed) return;
    expect(claimTooSoon.formattedRemaining).toBe("18h 0m");

    // Claim after 21 hours (streak continues to 2)
    const nextDay = new Date(now.getTime() + DAILY_COOLDOWN_MS + 60 * 60 * 1000);
    const claim2 = processDailyClaim(user, nextDay);
    expect(claim2.claimed).toBe(true);
    if (!claim2.claimed) return;
    expect(claim2.newStreak).toBe(2);

    // Claim after 60 hours (streak resets to 1 because > 48h)
    const expiredDay = new Date(nextDay.getTime() + STREAK_EXPIRY_MS + 10 * 60 * 60 * 1000);
    user.lastDailyAt = nextDay;
    user.dailyStreak = 2;
    const claimReset = processDailyClaim(user, expiredDay);
    expect(claimReset.claimed).toBe(true);
    if (!claimReset.claimed) return;
    expect(claimReset.newStreak).toBe(1);
  });

  it("formats bag message with real inventory values", () => {
    const user = new UserEntity({
      id: 1,
      telegramId: 100,
      username: "blue",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [],
      pokeballs: 25,
      greatballs: 5,
      ultraballs: 3,
      masterballs: 1,
      lastDailyAt: null,
      dailyStreak: 4,
    });

    const msg = formatBagMessage(user);
    expect(msg).toContain("🎒 *Trainer's Bag* — @blue");
    expect(msg).toContain("🔴 Pokéball: 25");
    expect(msg).toContain("🔵 Great Ball: 5");
    expect(msg).toContain("🟡 Ultra Ball: 3");
    expect(msg).toContain("🟣 Master Ball: 1");
    expect(msg).toContain("Ready to claim! (/daily)");
    expect(msg).toContain("Streak: 4 day(s)");
  });
});

describe("Inventory Bot Commands Integration", () => {
  let botCtx: TestBotContext;

  beforeEach(async () => {
    botCtx = await createTestBot();
  });

  it("/bag reports error for unregistered users", async () => {
    await botCtx.dispatchCommand("/bag", { fromId: 999 });
    const msgs = botCtx.client.getSentMessages();
    expect(msgs[0]?.text).toContain("You are not registered");
  });

  it("/bag shows current stock for registered users", async () => {
    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 1,
        telegramId: 101,
        username: "misty",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
        pokeballs: 12,
        greatballs: 3,
        ultraballs: 1,
        masterballs: 0,
      }),
    );

    await botCtx.dispatchCommand("/bag", { fromId: 101, username: "misty" });
    const msgs = botCtx.client.getSentMessages();
    expect(msgs.length).toBe(1);
    expect(msgs[0]?.text).toContain("🎒 *Trainer's Bag* — @misty");
    expect(msgs[0]?.text).toContain("🔴 Pokéball: 12");
    expect(msgs[0]?.text).toContain("🔵 Great Ball: 3");
    expect(msgs[0]?.text).toContain("🟡 Ultra Ball: 1");
  });

  it("/daily grants supplies and prevents claiming during cooldown", async () => {
    botCtx.userDataSource.seedUser(
      new UserEntity({
        id: 1,
        telegramId: 102,
        username: "brock",
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [],
        pokeballs: 10,
        greatballs: 2,
        ultraballs: 0,
        masterballs: 0,
        lastDailyAt: null,
        dailyStreak: 0,
      }),
    );

    // First claim
    await botCtx.dispatchCommand("/daily", { fromId: 102, username: "brock" });
    const msgs = botCtx.client.getSentMessages();
    expect(msgs[0]?.text).toContain("🎁 *Daily Reward Claimed!*");
    expect(msgs[0]?.text).toContain("Current Streak: 1 day(s)");
    expect(msgs[0]?.text).toContain("+5 🔴 Pokéballs");
    expect(msgs[0]?.text).toContain("+2 🔵 Great Balls");

    // Verify DB updated
    const userInDb = await botCtx.userDataSource.findUserByTelegramId(102);
    expect(userInDb?.pokeballs).toBe(15);
    expect(userInDb?.greatballs).toBe(4);
    expect(userInDb?.dailyStreak).toBe(1);
    expect(userInDb?.lastDailyAt).not.toBeNull();

    // Second claim immediately -> blocked
    botCtx.client.clear();
    await botCtx.dispatchCommand("/daily", { fromId: 102, username: "brock" });
    const cooldownMsgs = botCtx.client.getSentMessages();
    expect(cooldownMsgs[0]?.text).toContain("You've already claimed your daily bonus");
  });
});
