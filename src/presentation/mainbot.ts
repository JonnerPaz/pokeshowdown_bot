import type { AppContext } from "./data/types.js";
import { Bot, type BotConfig } from "grammy";
import { commands, LanguageCodes } from "@grammyjs/commands";
import { conversations } from "@grammyjs/conversations";
import { PokeApiService } from "./services/pokeapi.service.js";
import { UserDataSourceImpl } from "../infrastructure/datasource/user.datasource.impl.js";
import { PokemonDataSourceImpl } from "../infrastructure/datasource/pokemon.datasource.impl.js";
import type { UserDataSource } from "../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../domain/datasource/pokemon.datasource.js";
import { getAllCommands } from "./controllers/commands.js";
import { createSystemFeature } from "../features/system/system.feature.js";
import { createAuthFeature } from "../features/auth/auth.feature.js";
import { createBattleFeature } from "../features/battle/battle.feature.js";
import { createPokemonFeature } from "../features/pokemon/pokemon.feature.js";
import { createPokedexFeature } from "../features/pokedex/pokedex.feature.js";
import { createInventoryFeature } from "../features/inventory/inventory.feature.js";
import { createProfileFeature } from "../features/profile/profile.feature.js";
import { createInlineFeature } from "../features/inline/inline.feature.js";
import { autoRetry } from "@grammyjs/auto-retry";
import { BattleService } from "../features/battle/battle.service.js";
import { RateLimiterService } from "./services/rateLimiter.service.js";
import { GroupEncounterService } from "../features/pokemon/groupEncounter.service.js";

export interface MainBotOptions {
  botConfig?: BotConfig<AppContext> | undefined;
  userDatasource?: UserDataSource | undefined;
  pokemonDatasource?: PokemonDataSource | undefined;
  pokeApi?: PokeApiService | undefined;
  rateLimiter?: RateLimiterService | undefined;
  battleService?: BattleService | undefined;
  groupEncounterService?: GroupEncounterService | undefined;
}

export class MainBot {
  public readonly bot: Bot<AppContext>;
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

    const userDatasource = options.userDatasource ?? new UserDataSourceImpl();
    const pokemonDatasource = options.pokemonDatasource ?? new PokemonDataSourceImpl();

    const pokeApi = options.pokeApi ?? new PokeApiService();
    const rateLimiter = options.rateLimiter ?? new RateLimiterService();
    const battleService =
      options.battleService ?? new BattleService(pokeApi, userDatasource, pokemonDatasource);
    const groupEncounterService = options.groupEncounterService ?? new GroupEncounterService();

    // Setup features
    this.bot.use(createSystemFeature());
    this.bot.use(createAuthFeature({ userDataSource: userDatasource, pokeApi }));
    this.bot.use(createBattleFeature({ userDataSource: userDatasource, battleService }));
    this.bot.use(
      createPokemonFeature({
        userDataSource: userDatasource,
        pokemonDataSource: pokemonDatasource,
        pokeApi,
        rateLimiter,
        groupEncounterService,
      }),
    );
    this.bot.use(createPokedexFeature({ pokeApi, userDataSource: userDatasource }));
    this.bot.use(createInventoryFeature({ userDataSource: userDatasource }));
    this.bot.use(createProfileFeature({ userDataSource: userDatasource }));
    this.bot.use(createInlineFeature({ pokeApi, userDataSource: userDatasource }));
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

    await this.bot.api.setMyCommands(getAllCommands(LanguageCodes.English));

    await this.bot.api.setMyCommands(getAllCommands(LanguageCodes.Spanish), {
      language_code: LanguageCodes.Spanish,
    });
  }
}
