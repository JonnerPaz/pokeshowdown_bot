import type { AppContext } from "./data/types.js";
import { Bot, type BotConfig } from "grammy";
import { commands, LanguageCodes } from "@grammyjs/commands";
import { conversations, createConversation } from "@grammyjs/conversations";
import { PokeApiService } from "./services/pokeapi.service.js";
import { UserDataSourceImpl } from "../infrastructure/datasource/user.datasource.impl.js";
import { PokemonDataSourceImpl } from "../infrastructure/datasource/pokemon.datasource.impl.js";
import type { UserDataSource } from "../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../domain/datasource/pokemon.datasource.js";
import { botConversations } from "./services/addConversation.decorator.js";
import { DBService } from "./services/db.service.js";
import { PokemonController } from "./controllers/Pokemon.controller.js";
import { getAllCommands } from "./controllers/commands.js";
import { BattleController } from "./controllers/Battle.controller.js";
import { createSystemFeature } from "../features/system/system.feature.js";
import { createAuthFeature } from "../features/auth/auth.feature.js";
import { PokemonConversation } from "./services/Pokemon.conversation.service.js";
import { BattleConversation } from "./services/Battle.conversation.service.js";
import { BattleService } from "../features/battle/battle.service.js";
import { RateLimiterService } from "./services/rateLimiter.service.js";

export interface MainBotOptions {
  botConfig?: BotConfig<AppContext>;
  userDatasource?: UserDataSource;
  pokemonDatasource?: PokemonDataSource;
  pokeApi?: PokeApiService;
  dbService?: DBService;
  rateLimiter?: RateLimiterService;
  battleService?: BattleService;
}

export class MainBot {
  private pokemonController: PokemonController;
  private battleController: BattleController;

  public readonly bot: Bot<AppContext>;
  public static instance: MainBot;

  constructor(apiKey: string = process.env.API_KEY as string, options: MainBotOptions = {}) {
    this.bot = new Bot<AppContext>(apiKey, options.botConfig);
    this.setupErrorHandler();

    // Setup core services
    this.bot.use(commands());
    this.bot.use(conversations());

    const userDatasource = options.userDatasource ?? new UserDataSourceImpl();
    const pokemonDatasource = options.pokemonDatasource ?? new PokemonDataSourceImpl();

    const pokeApi = options.pokeApi ?? new PokeApiService();
    const dbService =
      options.dbService ?? new DBService(userDatasource, pokemonDatasource, pokeApi);
    const rateLimiter = options.rateLimiter ?? new RateLimiterService();
    const battleService = options.battleService ?? new BattleService(pokeApi, dbService);

    // Setup conversations (decorators register them into botConversations)
    void new PokemonConversation(dbService, rateLimiter);
    void new BattleConversation(dbService, battleService);

    // Setup features
    this.bot.use(createSystemFeature());
    this.bot.use(createAuthFeature({ userDataSource: userDatasource, pokeApi }));

    // Setup controllers
    this.pokemonController = new PokemonController(this.bot);
    this.battleController = new BattleController(this.bot);

    this.registerConversations();
  }

  private setupErrorHandler() {
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

    await Promise.all([
      this.pokemonController.pokemons(),
      this.pokemonController.generatePokemon(),
      this.pokemonController.evolve(),
      this.pokemonController.shiny(),
      this.pokemonController.trade(),
      this.pokemonController.nickname(),
      this.battleController.battle(),
    ]);

    const controllers = [this.pokemonController, this.battleController];
    for (const controller of controllers) {
      this.bot.use(controller.middleware());
    }

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

  private registerConversations() {
    for (const [name, conversation] of botConversations.entries()) {
      this.bot.use(createConversation(conversation, name));
    }
  }
}
