import {
  CATCH_RATE_LIMIT_MAX,
  CATCH_RATE_LIMIT_WINDOW_MS,
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
