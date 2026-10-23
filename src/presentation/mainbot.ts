import { autoRetry } from "@grammyjs/auto-retry";
import { commands, LanguageCodes } from "@grammyjs/commands";
import { conversations } from "@grammyjs/conversations";
import { Bot, type BotConfig } from "grammy";

import type { PokemonDataSource } from "../domain/datasource/pokemon.datasource.js";
import type { UserDataSource } from "../domain/datasource/user.datasource.js";
import type { ArenaService } from "../features/arena/arena.service.js";
import { createAuthFeature } from "../features/auth/auth.feature.js";
import { createBattleFeature, formatArenaBattleResult } from "../features/battle/battle.feature.js";
import type { BattleService } from "../features/battle/battle.service.js";
import { createInlineFeature } from "../features/inline/inline.feature.js";
import { createInventoryFeature } from "../features/inventory/inventory.feature.js";
import { createPokedexFeature } from "../features/pokedex/pokedex.feature.js";
import type { GroupEncounterService } from "../features/pokemon/groupEncounter.service.js";
import { createPokemonFeature } from "../features/pokemon/pokemon.feature.js";
import { createProfileFeature } from "../features/profile/profile.feature.js";
import { createSystemFeature } from "../features/system/system.feature.js";
import { getCommandRegistrations } from "./controllers/commands.js";
import type { AppContext } from "./data/types.js";
import { createAppDeps, type AppDeps } from "./deps.js";
import type { PokeApiService } from "./services/pokeapi.service.js";
import type { RateLimiterService } from "./services/rateLimiter.service.js";

export interface MainBotOptions {
  botConfig?: BotConfig<AppContext> | undefined;
  userDatasource?: UserDataSource | undefined;
  pokemonDatasource?: PokemonDataSource | undefined;
  pokeApi?: PokeApiService | undefined;
  rateLimiter?: RateLimiterService | undefined;
  battleService?: BattleService | undefined;
  groupEncounterService?: GroupEncounterService | undefined;
  arena?: ArenaService | null | undefined;
  webAppUrl?: string | undefined;
  turnTimeoutMs?: number | undefined;
}

export class MainBot {
  public readonly bot: Bot<AppContext>;
  public readonly deps: AppDeps;
  public static instance: MainBot;

  constructor(apiKey: string = process.env.API_KEY as string, options: MainBotOptions = {}) {
    this.bot = new Bot<AppContext>(apiKey, options.botConfig);
    this.bot.api.config.use(
      autoRetry({
        maxRetryAttempts: 3,
        maxDelaySeconds: 15,
      }),
    );
    this.setupErrorHandler();

    // Setup core services
    this.bot.use(commands());
    this.bot.use(conversations());

    const deps = createAppDeps({
      userDataSource: options.userDatasource,
      pokemonDataSource: options.pokemonDatasource,
      pokeApi: options.pokeApi,
      rateLimiter: options.rateLimiter,
      battleService: options.battleService,
      groupEncounterService: options.groupEncounterService,
      arena: options.arena,
      webAppUrl: options.webAppUrl,
      turnTimeoutMs: options.turnTimeoutMs,
      onBattleFinished: async (room) => {
        if (room.chatId === null) return;
        const text = formatArenaBattleResult(room);
        if (!text) return;
        await this.bot.api.sendMessage(room.chatId, text, { parse_mode: "Markdown" });
      },
    });
    this.deps = deps;

    // Setup features
    this.bot.use(createSystemFeature());
    this.bot.use(createAuthFeature({ userDataSource: deps.userDataSource, pokeApi: deps.pokeApi }));
    this.bot.use(
      createBattleFeature({
        userDataSource: deps.userDataSource,
        arena: deps.arena,
        webAppUrl: deps.webAppUrl,
      }),
    );
    this.bot.use(
      createPokemonFeature({
        userDataSource: deps.userDataSource,
        pokemonDataSource: deps.pokemonDataSource,
        pokeApi: deps.pokeApi,
        rateLimiter: deps.rateLimiter,
        groupEncounterService: deps.groupEncounterService,
      }),
    );
    this.bot.use(
      createPokedexFeature({ pokeApi: deps.pokeApi, userDataSource: deps.userDataSource }),
    );
    this.bot.use(createInventoryFeature({ userDataSource: deps.userDataSource }));
    this.bot.use(createProfileFeature({ userDataSource: deps.userDataSource }));
    this.bot.use(
      createInlineFeature({ pokeApi: deps.pokeApi, userDataSource: deps.userDataSource }),
    );
  }

  private setupErrorHandler() {
    this.bot.use(async (ctx, next) => {
      try {
        await next();
      } catch (err) {
        const username = ctx.from?.username ?? ctx.chat?.id?.toString() ?? "unknown";
        console.error("bot error caught in root middleware", { username, error: err });
        await ctx
          .reply("There was an error during request. Please report it")
          .catch((replyError) => {
            console.error("failed to notify user of error", { username, error: replyError });
          });
      }
    });

    this.bot.catch(({ error, ctx }) => {
      const username = ctx.from?.username ?? ctx.chat?.id?.toString() ?? "unknown";
      console.error("bot.catch: unhandled error", { username, error });

      ctx.reply("There was an error during request. Please report it").catch((replyError) => {
        console.error("bot.catch: failed to notify user", { username, error: replyError });
      });
    });
  }

  public async registerControllers() {
    await this.bot.init();
    await this.registerBotMenuCommands();
  }

  public async registerBotMenuCommands(): Promise<void> {
    const scopesToClean = [
      { type: "all_private_chats" as const },
      { type: "all_group_chats" as const },
      { type: "all_chat_administrators" as const },
    ];

    for (const scope of scopesToClean) {
      await this.bot.api.deleteMyCommands({ scope }).catch(() => {});
      await this.bot.api
        .deleteMyCommands({ scope, language_code: LanguageCodes.Spanish })
        .catch(() => {});
    }

    for (const registration of getCommandRegistrations()) {
      await this.bot.api.setMyCommands(registration.commands, {
        scope: registration.scope,
        ...(registration.language_code ? { language_code: registration.language_code } : {}),
      });
    }
  }
}
