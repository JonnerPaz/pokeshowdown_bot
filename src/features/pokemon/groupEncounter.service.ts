import { randomUUID } from "node:crypto";
import type { Api } from "grammy";
import type { AppContext } from "../../presentation/data/types.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import {
  type BallType,
  BALL_CONFIGS,
  getBallUserField,
  getUserBallCount,
  rollCatchAttempt,
} from "../../domain/items/ballTypes.js";
import {
  GROUP_CATCH_FLEE_CHANCE,
  GROUP_ENCOUNTER_TIMEOUT_MS,
  GROUP_SPAWN_COOLDOWN_MS,
  GROUP_SPAWN_MESSAGE_MAX,
  GROUP_SPAWN_MESSAGE_MIN,
  MAX_PKMN_PARTY,
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

  public trackMessage(chatId: number | bigint, senderId?: number | bigint): boolean {
    const key = String(chatId);
    let activity = this.chatActivity.get(key);
    const now = Date.now();

    if (!activity) {
      activity = {
        count: 0,
        threshold: this.randomThreshold(),
        lastSpawnTime: 0,
      };
      this.chatActivity.set(key, activity);
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

    this.encounterTimers.set(encounterId, timer);
    this.activeEncounters.set(encounterId, encounter);
    return encounter;
  }

  /**
   * Handles a multiplayer group catch attempt using a double-checked mutex lock pattern.
   *
   * Concurrency Safety (Mutex):
   * When multiple group members tap catch buttons at the same millisecond, Node.js pauses
   * during asynchronous database I/O (user lookup, party size, inventory checks). To prevent race
   * conditions where multiple trainers deduct balls and claim the same single Pokémon:
   * 1. Check 1 (Fast-fail): Instant check if the encounter is resolved before running DB queries.
   * 2. Check 2 (Mutex Guard): A second check immediately before ball deduction and capture roll.
   *    If another concurrent attempt succeeded or caused the Pokémon to flee while this user's DB
   *    queries were in flight, this guard aborts without deducting any items from the user's bag.
   * 3. Atomic State Resolution: Setting `encounter.isResolved = true` and removing from active map
   *    is executed synchronously on the event loop, immediately locking out all queued attempts.
   */
  public async handleGroupCatchAttempt(
    ctx: AppContext,
    encounterId: string,
    ballType: BallType,
    deps: {
      userDataSource: UserDataSource;
      pokemonDataSource: PokemonDataSource;
    },
  ): Promise<void> {
    const encounter = this.activeEncounters.get(encounterId);
    if (!encounter || encounter.isResolved) {
      await ctx.answerCallbackQuery({
        text: "This Pokémon was already caught or fled!",
        show_alert: true,
      });
      return;
    }

    const userId = ctx.from?.id;
    if (!userId) return;

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

    // =========================================================================
    // MUTEX / CRITICAL SECTION GUARD (Double-Checked State Pattern)
    // =========================================================================
    // Why this second check is required:
    // Node.js is single-threaded but asynchronous. While this user's database
    // lookups above (findUserByTelegramId, party capacity, inventory check) were
    // awaiting I/O, other users' callback queries were processed concurrently.
    //
    // If another trainer caught or spooked this Pokémon during that async window,
    // `encounter.isResolved` was set to `true`. Checking it here acts as a mutex
    // barrier:
    // 1. It protects the trainer's inventory: no ball is deducted.
    // 2. It prevents double-captures of the same wild Pokémon instance.
    // =========================================================================
    if (encounter.isResolved) {
      await ctx.answerCallbackQuery({
        text: "Too late! Someone else just caught or scared it away!",
        show_alert: true,
      });
      return;
    }

    // Deduct ball from inventory
    const field = getBallUserField(ballType);
    user[field] -= 1;
    await deps.userDataSource.updateUser(user, { [field]: user[field] });

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
