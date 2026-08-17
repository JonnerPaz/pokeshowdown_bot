import type { AppContext } from "./data/types.js";
import { Bot } from "grammy";
import { commands, LanguageCodes } from "@grammyjs/commands";
import { conversations, createConversation } from "@grammyjs/conversations";
import { PokeApiService } from "./services/pokeapi.service.js";
import { UserDataSourceImpl } from "../infrastructure/datasource/user.datasource.impl.js";
import { PokemonDataSourceImpl } from "../infrastructure/datasource/pokemon.datasource.impl.js";
import { botConversations } from "./services/addConversation.decorator.js";
import { DBService } from "./services/db.service.js";
import { AuthController } from "./controllers/Auth.controller.js";
import { PokemonController } from "./controllers/Pokemon.controller.js";
import { getAllCommands } from "./controllers/commands.js";
import { SystemController } from "./controllers/System.controller.js";
import { AuthConversation } from "./services/Auth.conversation.service.js";
import { PokemonConversation } from "./services/Pokemon.conversation.service.js";

export class MainBot {
  private authController: AuthController;
  private pokemonController: PokemonController;
  private systemController: SystemController;

  public readonly bot: Bot<AppContext>;
  public static instance: MainBot;

  constructor(apiKey: string = process.env.API_KEY as string) {
    this.bot = new Bot<AppContext>(apiKey);

    // Setup core services
    this.bot.use(commands());
    this.bot.use(conversations());

    const userDatasource = new UserDataSourceImpl();
    const pokemonDatasource = new PokemonDataSourceImpl();

    const pokeApi = new PokeApiService(pokemonDatasource);
    const dbService = new DBService(userDatasource, pokemonDatasource, pokeApi);

    // Setup conversations (decorators register them into botConversations)
    void new AuthConversation(dbService);
    void new PokemonConversation(dbService);

    // Setup controllers
    this.authController = new AuthController(this.bot);
    this.pokemonController = new PokemonController(this.bot);
    this.systemController = new SystemController(this.bot);

    // init controllers and conversations
    this.registerControllers();
    this.registerConversations();
  }

  private async registerControllers() {
    await Promise.all([
      this.authController.start(),
      this.authController.register(),
      this.systemController.help(),
      this.authController.deleteAccount(),
      this.pokemonController.pokemons(),
      this.pokemonController.generatePokemon(),
      this.pokemonController.evolve(),
      this.pokemonController.shiny(),
      this.pokemonController.trade(),
      this.pokemonController.nickname(),
    ]);

    const controllers = [this.authController, this.pokemonController, this.systemController];
    for (const controller of controllers) {
      this.bot.use(controller.middleware());
    }

    await this.registerBotMenuCommands();
  }

  public async registerBotMenuCommands(): Promise<void> {
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
