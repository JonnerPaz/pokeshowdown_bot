import { randomUUID } from "node:crypto";
import type { Api } from "grammy";
import type { AppContext } from "../../presentation/data/types.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { RateLimiterService } from "../../presentation/services/rateLimiter.service.js";
import {
  type BallType,
  BALL_CONFIGS,
  getUserBallCount,
  rollCatchAttempt,
} from "../../domain/items/ballTypes.js";
import {
  GROUP_CATCH_FLEE_CHANCE,
  GROUP_CHAT_ACTIVITY_TTL_MS,
  GROUP_ENCOUNTER_TIMEOUT_MS,
  GROUP_SPAWN_COOLDOWN_MS,
  GROUP_SPAWN_MESSAGE_MAX,
  GROUP_SPAWN_MESSAGE_MIN,
  MAX_PKMN_PARTY,
  MEMORY_PRUNE_INTERVAL,
} from "../../domain/data/constants.js";
import { escapeMarkdown } from "../common/stringHelper.js";
import { getPokemonFrontSprite } from "./pokemon.service.js";
import { createGroupCatchKeyboard } from "./pokemon.keyboards.js";

export interface GroupEncounter {
  id: string;
  chatId: number;
  messageId: number;
  pokemon: PokemonEntity;
  captureRate: number;
  isResolved: boolean;
  /** Set synchronously while an attempt is in flight to serialize concurrent throws. */
  isBusy: boolean;
  expiresAt: number;
}

export interface GroupEncounterServiceOptions {
  spawnMessageMin?: number;
  spawnMessageMax?: number;
  spawnCooldownMs?: number;
  encounterTimeoutMs?: number;
  fleeChance?: number;
}

interface ChatActivity {
  count: number;
  threshold: number;
  lastSpawnTime: number;
  lastSeenAt: number;
  lastSenderId?: string | undefined;
  lastSenderTime?: number | undefined;
}

export class GroupEncounterService {
  private readonly spawnMessageMin: number;
  private readonly spawnMessageMax: number;
  private readonly spawnCooldownMs: number;
  private readonly encounterTimeoutMs: number;
  private readonly fleeChance: number;

  private readonly chatActivity = new Map<string, ChatActivity>();
  private readonly activeEncounters = new Map<string, GroupEncounter>();
  private readonly encounterTimers = new Map<string, NodeJS.Timeout>();
  private messageCount = 0;

  /** Number of chats currently tracked. Exposed for diagnostics/tests. */
  public get trackedChatCount(): number {
    return this.chatActivity.size;
  }

  constructor(options: GroupEncounterServiceOptions = {}) {
    this.spawnMessageMin = options.spawnMessageMin ?? GROUP_SPAWN_MESSAGE_MIN;
    this.spawnMessageMax = options.spawnMessageMax ?? GROUP_SPAWN_MESSAGE_MAX;
    this.spawnCooldownMs = options.spawnCooldownMs ?? GROUP_SPAWN_COOLDOWN_MS;
    this.encounterTimeoutMs = options.encounterTimeoutMs ?? GROUP_ENCOUNTER_TIMEOUT_MS;
    this.fleeChance = options.fleeChance ?? GROUP_CATCH_FLEE_CHANCE;
  }

  private randomThreshold(): number {
    return Math.floor(
      Math.random() * (this.spawnMessageMax - this.spawnMessageMin + 1) + this.spawnMessageMin,
    );
  }

  /**
   * Drops chats that have been silent for longer than the activity TTL so the
   * activity map does not retain every group the bot has ever seen.
   */
  private pruneChatActivity(now: number): void {
    for (const [key, activity] of this.chatActivity) {
      if (now - activity.lastSeenAt > GROUP_CHAT_ACTIVITY_TTL_MS) {
        this.chatActivity.delete(key);
      }
    }
  }

  public trackMessage(chatId: number | bigint, senderId?: number | bigint): boolean {
    const key = String(chatId);
    let activity = this.chatActivity.get(key);
    const now = Date.now();

    if (!activity) {
      activity = {
        count: 0,
        threshold: this.randomThreshold(),
        lastSpawnTime: 0,
        lastSeenAt: now,
      };
      this.chatActivity.set(key, activity);
    }

    activity.lastSeenAt = now;

    this.messageCount += 1;
    if (this.messageCount >= MEMORY_PRUNE_INTERVAL) {
      this.messageCount = 0;
      this.pruneChatActivity(now);
    }

    // Anti-spam guard: rapid consecutive messages from the same sender within 2s don't increment
    const sId = senderId !== undefined ? String(senderId) : undefined;
    if (sId && activity.lastSenderId === sId && now - (activity.lastSenderTime ?? 0) < 2000) {
      return false;
    }

    activity.lastSenderId = sId;
    activity.lastSenderTime = now;
    activity.count += 1;

    if (
      activity.count >= activity.threshold &&
      now - activity.lastSpawnTime >= this.spawnCooldownMs
    ) {
      activity.count = 0;
      activity.threshold = this.randomThreshold();
      activity.lastSpawnTime = now;
      return true;
    }

    return false;
  }

  public async spawnGroupPokemon(
    api: Api,
    chatId: number | bigint,
    deps: { pokeApi: PokeApiService },
  ): Promise<GroupEncounter> {
    const numericChatId = Number(chatId);

    // Expire any existing active encounter in the same chat
    const existingEncounter = Array.from(this.activeEncounters.values()).find(
      (e) => e.chatId === numericChatId && !e.isResolved,
    );
    if (existingEncounter) {
      existingEncounter.isResolved = true;
      this.clearTimer(existingEncounter.id);
      this.activeEncounters.delete(existingEncounter.id);
    }

    const pokemon = await deps.pokeApi.createPokemon();
    const captureRate = await deps.pokeApi.getPokemonCaptureRate(pokemon.name);
    const encounterId = randomUUID().slice(0, 8);

    const escapedName = escapeMarkdown(pokemon.name);
    const shinyMark = pokemon.isShiny ? " ✨" : "";
    const caption =
      `🌿 *A wild Pokémon appeared!*\n\n` +
      `A wild *${escapedName}*${shinyMark} jumped out of the tall grass!\n` +
      `Any trainer in this group can throw a Pokéball to catch it!`;

    const keyboard = createGroupCatchKeyboard(encounterId);
    const spriteUrl = getPokemonFrontSprite(pokemon);

    let sentMsg: { message_id: number };
    try {
      sentMsg = await api.sendPhoto(numericChatId, spriteUrl, {
        caption,
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    } catch {
      sentMsg = await api.sendMessage(numericChatId, caption, {
        reply_markup: keyboard,
        parse_mode: "Markdown",
      });
    }

    const encounter: GroupEncounter = {
      id: encounterId,
      chatId: numericChatId,
      messageId: sentMsg.message_id,
      pokemon,
      captureRate,
      isResolved: false,
      isBusy: false,
      expiresAt: Date.now() + this.encounterTimeoutMs,
    };

    const timer = setTimeout(async () => {
      if (!encounter.isResolved) {
        encounter.isResolved = true;
        this.activeEncounters.delete(encounterId);
        this.encounterTimers.delete(encounterId);
        const fleeText = `💨 The wild *${escapedName}*${shinyMark} got tired of waiting and fled into the wild!`;
        await api
          .editMessageCaption(numericChatId, sentMsg.message_id, {
            caption: fleeText,
            parse_mode: "Markdown",
          })
          .catch(async () => {
            await api
              .editMessageText(numericChatId, sentMsg.message_id, fleeText, {
                parse_mode: "Markdown",
              })
              .catch(() => {});
          });
      }
    }, this.encounterTimeoutMs);
    if (typeof timer.unref === "function") {
      timer.unref();
    }

    this.encounterTimers.set(encounterId, timer);
    this.activeEncounters.set(encounterId, encounter);
    return encounter;
  }

  /**
   * Handles a multiplayer group catch attempt.
   *
   * Concurrency Safety (Synchronous Reservation Mutex):
   * When multiple group members tap catch buttons at the same millisecond, Node.js pauses
   * during asynchronous database I/O (user lookup, party size, inventory checks). To prevent
   * race conditions where multiple trainers deduct balls and claim the same single Pokémon:
   * 1. Fast-fail: instant check whether the encounter is already resolved.
   * 2. Reservation: `encounter.isBusy` is claimed **synchronously**, before any `await`, so a
   *    second tap observes the lock and aborts immediately (no overlapping critical section).
   * 3. Re-check: after the awaits, `isResolved` is re-checked in case the encounter was caught,
   *    spooked, or timed out while this attempt's lookups were in flight.
   * 4. Resolution/release: catch/flee set `isResolved` and remove the encounter from the active
   *    pool synchronously; a harmless "broke free" releases the reservation so others can retry.
   */
  public async handleGroupCatchAttempt(
    ctx: AppContext,
    encounterId: string,
    ballType: BallType,
    deps: {
      userDataSource: UserDataSource;
      pokemonDataSource: PokemonDataSource;
      rateLimiter?: RateLimiterService;
    },
  ): Promise<void> {
    const userId = ctx.from?.id;
    if (!userId) return;

    if (deps.rateLimiter && !deps.rateLimiter.isAllowed(userId, "catch")) {
      await ctx.answerCallbackQuery({
        text: "Slow down! You're throwing balls too quickly. Try again in a moment.",
        show_alert: true,
      });
      return;
    }

    const encounter = this.activeEncounters.get(encounterId);
    if (!encounter || encounter.isResolved) {
      await ctx.answerCallbackQuery({
        text: "This Pokémon was already caught or fled!",
        show_alert: true,
      });
      return;
    }

    // Synchronous reservation: claim the encounter before the first `await` so that
    // concurrent taps can never both enter the critical section.
    if (encounter.isBusy) {
      await ctx.answerCallbackQuery({
        text: "Someone is already throwing a Pokéball — try again in a moment!",
        show_alert: true,
      });
      return;
    }
    encounter.isBusy = true;

    try {
      const user = await deps.userDataSource.findUserByTelegramId(userId);
      if (!user) {
        await ctx.answerCallbackQuery({
          text: "You must register first with /register to catch Pokémon!",
          show_alert: true,
        });
        return;
      }

      const doesExist = await deps.pokemonDataSource.findUserPokemonByNameAndVariant(
        user.id!,
        encounter.pokemon.name,
        encounter.pokemon.isShiny,
      );

      const ballConfig = BALL_CONFIGS[ballType];
      const count = getUserBallCount(user, ballType);
      if (count <= 0) {
        await ctx.answerCallbackQuery({
          text: `You don't have any ${ballConfig.name}s left! Check /bag or /daily.`,
          show_alert: true,
        });
        return;
      }

      if (deps.rateLimiter) {
        deps.rateLimiter.hit(userId, "catch");
      }

      // Re-check after the awaits above: another attempt or the despawn timer may
      // have resolved this encounter while our database lookups were in flight.
      if (encounter.isResolved) {
        await ctx.answerCallbackQuery({
          text: "Too late! Someone else just caught or scared it away!",
          show_alert: true,
        });
        return;
      }

      // Deduct ball from inventory atomically so concurrent throws cannot lose an update.
      await deps.userDataSource.decrementBall(user, ballType);

      const attempt = rollCatchAttempt(encounter.captureRate, ballType);

      if (attempt.caught) {
        // Synchronous atomic lock: instantly marks the encounter resolved and removes
        // it from the active pool before any subsequent async database updates.
        encounter.isResolved = true;
        this.clearTimer(encounterId);
        this.activeEncounters.delete(encounterId);

        let destinationNotice = "";
        if (doesExist) {
          await deps.pokemonDataSource.updatePokemon(doesExist, {
            timesCaught: doesExist.timesCaught + 1,
          });
        } else {
          const party = user.party;
          const goesToParty = party.length < MAX_PKMN_PARTY;
          encounter.pokemon.isInParty = goesToParty;
          await deps.pokemonDataSource.createPokemon(encounter.pokemon, user);
          destinationNotice = goesToParty
            ? ` (Added to party: ${party.length + 1}/${MAX_PKMN_PARTY})`
            : " (Sent to PC Storage Box 📦)";
        }

        await ctx.answerCallbackQuery({
          text: `🎉 Gotcha! You caught ${encounter.pokemon.name}!${destinationNotice}`,
        });

        const username = escapeMarkdown(user.username);
        const pokemonName = escapeMarkdown(encounter.pokemon.name);
        const shinyStr = encounter.pokemon.isShiny ? " ✨" : "";
        const victoryText = `🎉 *Gotcha!* @${username} caught the wild *${pokemonName}*${shinyStr} using a ${ballConfig.name}!${destinationNotice ? `\n_${destinationNotice.trim()}_` : ""}`;

        await ctx.api
          .editMessageCaption(encounter.chatId, encounter.messageId, {
            caption: victoryText,
            parse_mode: "Markdown",
          })
          .catch(async () => {
            await ctx.api
              .editMessageText(encounter.chatId, encounter.messageId, victoryText, {
                parse_mode: "Markdown",
              })
              .catch(() => {});
          });
        return;
      }

      // Did not catch - check if wild Pokémon flees
      const fled = Math.random() < this.fleeChance;
      if (fled) {
        // Synchronous atomic lock: marks encounter resolved upon fleeing so no further attempts can catch it
        encounter.isResolved = true;
        this.clearTimer(encounterId);
        this.activeEncounters.delete(encounterId);

        await ctx.answerCallbackQuery({
          text: "💥 It broke free and fled into the wild! 💨",
          show_alert: true,
        });

        const username = escapeMarkdown(user.username);
        const pokemonName = escapeMarkdown(encounter.pokemon.name);
        const fledText = `💨 *Oh no!* The wild *${pokemonName}* broke free from @${username}'s throw and fled into the wild!`;

        await ctx.api
          .editMessageCaption(encounter.chatId, encounter.messageId, {
            caption: fledText,
            parse_mode: "Markdown",
          })
          .catch(async () => {
            await ctx.api
              .editMessageText(encounter.chatId, encounter.messageId, fledText, {
                parse_mode: "Markdown",
              })
              .catch(() => {});
          });
        return;
      }

      // Broke free, but stayed!
      await ctx.answerCallbackQuery({
        text: `💥 Oh no! ${encounter.pokemon.name} broke free from the ${ballConfig.name}! Throw again!`,
      });
    } finally {
      // Only release the reservation if the encounter is still live; a resolved
      // encounter stays locked so no further throws can be accepted.
      if (!encounter.isResolved) {
        encounter.isBusy = false;
      }
    }
  }

  private clearTimer(encounterId: string): void {
    const timer = this.encounterTimers.get(encounterId);
    if (timer) {
      clearTimeout(timer);
      this.encounterTimers.delete(encounterId);
    }
  }

  public getActiveEncounter(encounterId: string): GroupEncounter | undefined {
    return this.activeEncounters.get(encounterId);
  }

  public clearActiveEncounters(): void {
    for (const timer of this.encounterTimers.values()) {
      clearTimeout(timer);
    }
    this.encounterTimers.clear();
    this.activeEncounters.clear();
  }
}
