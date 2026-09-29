import type { UserEntity } from "../entities/users.entity.js";

export type BallType = "pokeball" | "greatball" | "ultraball" | "masterball";

export interface BallConfig {
  id: BallType;
  name: string;
  emoji: string;
  multiplier: number;
  description: string;
}

export const BALL_CONFIGS: Record<BallType, BallConfig> = {
  pokeball: {
    id: "pokeball",
    name: "Pokéball",
    emoji: "🔴",
    multiplier: 1.0,
    description: "Standard ball with normal catch rate.",
  },
  greatball: {
    id: "greatball",
    name: "Great Ball",
    emoji: "🔵",
    multiplier: 1.5,
    description: "Higher quality ball with 1.5x catch rate.",
  },
  ultraball: {
    id: "ultraball",
    name: "Ultra Ball",
    emoji: "🟡",
    multiplier: 2.0,
    description: "High-performance ball with 2.0x catch rate.",
  },
  masterball: {
    id: "masterball",
    name: "Master Ball",
    emoji: "🟣",
    multiplier: Infinity,
    description: "Catches any wild Pokémon without fail.",
  },
};

export const DEFAULT_CAPTURE_RATE = 120;
export const DEFAULT_FLEE_RATE = 0.3;

export function calculateCatchProbability(baseCaptureRate: number, ballType: BallType): number {
  if (ballType === "masterball") return 1.0;
  const config = BALL_CONFIGS[ballType];
  const effectiveRate = Math.min(255, baseCaptureRate * config.multiplier);
  const prob = effectiveRate / 255;
  return Math.min(1.0, Math.max(0.02, prob));
}

export function rollCatchAttempt(
  baseCaptureRate: number,
  ballType: BallType,
  rng: () => number = Math.random,
): { caught: boolean; probability: number } {
  if (ballType === "masterball") {
    return { caught: true, probability: 1.0 };
  }
  const probability = calculateCatchProbability(baseCaptureRate, ballType);
  const roll = rng();
  return { caught: roll < probability, probability };
}

export function rollFlee(
  fleeRate: number = DEFAULT_FLEE_RATE,
  rng: () => number = Math.random,
): boolean {
  return rng() < fleeRate;
}

export function getUserBallCount(user: UserEntity, ballType: BallType): number {
  switch (ballType) {
    case "pokeball":
      return user.pokeballs;
    case "greatball":
      return user.greatballs;
    case "ultraball":
      return user.ultraballs;
    case "masterball":
      return user.masterballs;
  }
}

export function getBallUserField(
  ballType: BallType,
): "pokeballs" | "greatballs" | "ultraballs" | "masterballs" {
  switch (ballType) {
    case "pokeball":
      return "pokeballs";
    case "greatball":
      return "greatballs";
    case "ultraball":
      return "ultraballs";
    case "masterball":
      return "masterballs";
  }
}
