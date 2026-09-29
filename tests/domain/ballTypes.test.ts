import { describe, expect, it } from "vitest";
import {
  BALL_CONFIGS,
  calculateCatchProbability,
  getBallUserField,
  getUserBallCount,
  rollCatchAttempt,
  rollFlee,
} from "../../src/domain/items/ballTypes.js";
import { UserEntity } from "../../src/domain/entities/users.entity.js";

describe("ballTypes domain logic", () => {
  it("defines standard configurations for all 4 ball tiers", () => {
    expect(BALL_CONFIGS.pokeball.multiplier).toBe(1.0);
    expect(BALL_CONFIGS.greatball.multiplier).toBe(1.5);
    expect(BALL_CONFIGS.ultraball.multiplier).toBe(2.0);
    expect(BALL_CONFIGS.masterball.multiplier).toBe(Infinity);
  });

  describe("calculateCatchProbability", () => {
    it("guarantees 100% catch rate for Master Ball regardless of base capture rate", () => {
      expect(calculateCatchProbability(3, "masterball")).toBe(1.0);
      expect(calculateCatchProbability(255, "masterball")).toBe(1.0);
    });

    it("scales catch rate with ball multiplier", () => {
      const base = 100;
      const pokeProb = calculateCatchProbability(base, "pokeball");
      const greatProb = calculateCatchProbability(base, "greatball");
      const ultraProb = calculateCatchProbability(base, "ultraball");

      expect(pokeProb).toBeCloseTo(100 / 255, 3);
      expect(greatProb).toBeCloseTo(150 / 255, 3);
      expect(ultraProb).toBeCloseTo(200 / 255, 3);
      expect(greatProb).toBeGreaterThan(pokeProb);
      expect(ultraProb).toBeGreaterThan(greatProb);
    });

    it("caps probability at 1.0 when effective capture rate reaches or exceeds 255", () => {
      expect(calculateCatchProbability(255, "pokeball")).toBe(1.0);
      expect(calculateCatchProbability(200, "greatball")).toBe(1.0);
    });
  });

  describe("rollCatchAttempt", () => {
    it("always catches with a Master Ball", () => {
      const result = rollCatchAttempt(3, "masterball", () => 0.999);
      expect(result.caught).toBe(true);
      expect(result.probability).toBe(1.0);
    });

    it("catches when roll is below catch probability", () => {
      // 100 / 255 = ~0.392
      const successfulRoll = rollCatchAttempt(100, "pokeball", () => 0.2);
      expect(successfulRoll.caught).toBe(true);
    });

    it("fails when roll is above catch probability", () => {
      const failedRoll = rollCatchAttempt(100, "pokeball", () => 0.8);
      expect(failedRoll.caught).toBe(false);
    });
  });

  describe("rollFlee", () => {
    it("flees when roll is below fleeRate", () => {
      expect(rollFlee(0.3, () => 0.1)).toBe(true);
    });

    it("stays when roll is above fleeRate", () => {
      expect(rollFlee(0.3, () => 0.5)).toBe(false);
    });
  });

  describe("user inventory helpers", () => {
    const user = new UserEntity({
      id: 1,
      telegramId: 12345,
      username: "ash",
      createdAt: new Date(),
      updatedAt: new Date(),
      pokemons: [],
      pokeballs: 15,
      greatballs: 4,
      ultraballs: 2,
      masterballs: 1,
    });

    it("retrieves the correct ball count for each tier", () => {
      expect(getUserBallCount(user, "pokeball")).toBe(15);
      expect(getUserBallCount(user, "greatball")).toBe(4);
      expect(getUserBallCount(user, "ultraball")).toBe(2);
      expect(getUserBallCount(user, "masterball")).toBe(1);
    });

    it("maps ball types to user entity fields", () => {
      expect(getBallUserField("pokeball")).toBe("pokeballs");
      expect(getBallUserField("greatball")).toBe("greatballs");
      expect(getBallUserField("ultraball")).toBe("ultraballs");
      expect(getBallUserField("masterball")).toBe("masterballs");
    });
  });
});
