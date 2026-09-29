import type { UserEntity } from "../../domain/entities/users.entity.js";

export interface DailyRewards {
  pokeballs: number;
  greatballs: number;
  ultraballs: number;
  masterballs: number;
}

export const DAILY_COOLDOWN_MS = 20 * 60 * 60 * 1000; // 20 hours
export const STREAK_EXPIRY_MS = 48 * 60 * 60 * 1000; // 48 hours

export function calculateDailyRewards(streak: number): DailyRewards {
  let ultraballs = 0;
  let masterballs = 0;

  if (streak % 3 === 0) ultraballs += 1;
  if (streak % 7 === 0) ultraballs += 2;
  if (streak % 14 === 0) masterballs += 1;

  return {
    pokeballs: 5,
    greatballs: 2,
    ultraballs,
    masterballs,
  };
}

export function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  return `${hours}h ${minutes}m`;
}

export type DailyClaimResult =
  | {
      claimed: false;
      remainingMs: number;
      formattedRemaining: string;
    }
  | {
      claimed: true;
      rewards: DailyRewards;
      newStreak: number;
      updatedFields: Partial<UserEntity>;
    };

export function processDailyClaim(user: UserEntity, now: Date = new Date()): DailyClaimResult {
  if (user.lastDailyAt) {
    const elapsedMs = now.getTime() - new Date(user.lastDailyAt).getTime();
    if (elapsedMs < DAILY_COOLDOWN_MS) {
      const remainingMs = DAILY_COOLDOWN_MS - elapsedMs;
      return {
        claimed: false,
        remainingMs,
        formattedRemaining: formatTimeRemaining(remainingMs),
      };
    }
  }

  let newStreak = 1;
  if (user.lastDailyAt) {
    const elapsedMs = now.getTime() - new Date(user.lastDailyAt).getTime();
    if (elapsedMs <= STREAK_EXPIRY_MS) {
      newStreak = user.dailyStreak + 1;
    }
  }

  const rewards = calculateDailyRewards(newStreak);
  const updatedFields: Partial<UserEntity> = {
    pokeballs: user.pokeballs + rewards.pokeballs,
    greatballs: user.greatballs + rewards.greatballs,
    ultraballs: user.ultraballs + rewards.ultraballs,
    masterballs: user.masterballs + rewards.masterballs,
    lastDailyAt: now,
    dailyStreak: newStreak,
  };

  return {
    claimed: true,
    rewards,
    newStreak,
    updatedFields,
  };
}

export function formatBagMessage(user: UserEntity, now: Date = new Date()): string {
  let dailyStatus = "Ready to claim! (/daily)";
  if (user.lastDailyAt) {
    const elapsedMs = now.getTime() - new Date(user.lastDailyAt).getTime();
    if (elapsedMs < DAILY_COOLDOWN_MS) {
      const remainingMs = DAILY_COOLDOWN_MS - elapsedMs;
      dailyStatus = `Claimed (Next in ${formatTimeRemaining(remainingMs)})`;
    }
  }

  return (
    `🎒 *Trainer's Bag* — @${user.username}\n\n` +
    `*Pokéballs:*\n` +
    `🔴 Pokéball: ${user.pokeballs}\n` +
    `🔵 Great Ball: ${user.greatballs}\n` +
    `🟡 Ultra Ball: ${user.ultraballs}\n` +
    `🟣 Master Ball: ${user.masterballs}\n\n` +
    `*Daily Reward:*\n` +
    `🎁 Status: ${dailyStatus}\n` +
    `🔥 Streak: ${user.dailyStreak} day(s)`
  );
}
