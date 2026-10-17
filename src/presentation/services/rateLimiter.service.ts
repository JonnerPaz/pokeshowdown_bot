import {
  CATCH_RATE_LIMIT_MAX,
  CATCH_RATE_LIMIT_WINDOW_MS,
  MEMORY_PRUNE_INTERVAL,
  SPAWN_RATE_LIMIT_MAX,
  SPAWN_RATE_LIMIT_WINDOW_MS,
} from "../../domain/data/constants.js";

export type RateLimitAction = "spawn" | "catch";

interface RateLimitRule {
  windowMs: number;
  max: number;
}

const RULES: Record<RateLimitAction, RateLimitRule> = {
  spawn: { windowMs: SPAWN_RATE_LIMIT_WINDOW_MS, max: SPAWN_RATE_LIMIT_MAX },
  catch: { windowMs: CATCH_RATE_LIMIT_WINDOW_MS, max: CATCH_RATE_LIMIT_MAX },
};

export class RateLimiterService {
  private readonly hits = new Map<number, Map<RateLimitAction, number[]>>();
  private operationsSincePrune = 0;

  /** Number of users currently tracked. Exposed for diagnostics/tests. */
  public get trackedUserCount(): number {
    return this.hits.size;
  }

  public isAllowed(userId: number, action: RateLimitAction): boolean {
    const now = Date.now();
    const rule = RULES[action];
    const timestamps = this.getTimestamps(userId, action);
    return timestamps.filter((ts) => now - ts < rule.windowMs).length < rule.max;
  }

  public hit(userId: number, action: RateLimitAction): void {
    const now = Date.now();
    const rule = RULES[action];
    const timestamps = this.getTimestamps(userId, action).filter((ts) => now - ts < rule.windowMs);
    timestamps.push(now);
    this.setTimestamps(userId, action, timestamps);

    this.operationsSincePrune += 1;
    if (this.operationsSincePrune >= MEMORY_PRUNE_INTERVAL) {
      this.operationsSincePrune = 0;
      this.prune(now);
    }
  }

  /**
   * Drops users whose recorded hits have all aged out of every window so the map
   * cannot grow without bound as new users interact with the bot.
   */
  private prune(now: number): void {
    const maxWindow = Math.max(...Object.values(RULES).map((rule) => rule.windowMs));

    for (const [userId, actions] of this.hits) {
      for (const [action, timestamps] of actions) {
        const fresh = timestamps.filter((ts) => now - ts < maxWindow);
        if (fresh.length === 0) {
          actions.delete(action);
        } else {
          actions.set(action, fresh);
        }
      }

      if (actions.size === 0) {
        this.hits.delete(userId);
      }
    }
  }

  private getTimestamps(userId: number, action: RateLimitAction): number[] {
    return this.hits.get(userId)?.get(action) ?? [];
  }

  private setTimestamps(userId: number, action: RateLimitAction, timestamps: number[]): void {
    if (!this.hits.has(userId)) {
      this.hits.set(userId, new Map());
    }
    this.hits.get(userId)!.set(action, timestamps);
  }
}
