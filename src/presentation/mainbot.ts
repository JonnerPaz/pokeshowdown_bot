import type { AppContext } from "./data/types.js";
import { Bot } from "grammy";
import { commands } from "@grammyjs/commands";
import { conversations, createConversation } from "@grammyjs/conversations";
import { LoginController } from "./controllers/login.controller.js";
import { ConversationService } from "./services/conversation.service.js";
import { PokeApiService } from "./services/pokeapi.service.js";
import { UserRepositoryImpl } from "../infrastructure/repositories/user.repository.impl.js";
import { UserDataSourceImpl } from "../infrastructure/datasource/user.datasource.impl.js";
import { PokemonDataSourceImpl } from "../infrastructure/datasource/pokemon.datasource.impl.js";
import { PokemonRepositoryImpl } from "../infrastructure/repositories/pokemon.repository.impl.js";
import { botConversations } from "./services/addConversation.decorator.js";
import { DBService } from "./services/db.service.js";

export class MainBot {
  private loginController: LoginController<AppContext>;

  public readonly bot: Bot<AppContext>;
  public static instance: MainBot;

  private constructor(apiKey: string = process.env.API_KEY as string) {
    this.bot = new Bot<AppContext>(apiKey);
    const userDatasource = new UserDataSourceImpl();
    const userRepository = new UserRepositoryImpl(userDatasource);
    const pokemonDatasource = new PokemonDataSourceImpl();
    const pokemonRepository = new PokemonRepositoryImpl(pokemonDatasource);

    const pokeApi = new PokeApiService(pokemonRepository);
    const dbService = new DBService(userRepository, pokemonRepository, pokeApi);
    const conversationService = new ConversationService(dbService);

    // Setup core services
    this.bot.use(commands());
    this.bot.use(conversations());

    // Setup controllers
    this.loginController = new LoginController(this.bot);

    this.registerControllers();
    this.registerConversations();
  }

  private async registerControllers() {
    await Promise.all([
      this.loginController.start(),
      this.loginController.register(),
      this.loginController.help(),
      this.loginController.deleteAccount(),
      this.loginController.pokemons(),
      this.loginController.generatePokemon(),
      this.loginController.evolve(),
      this.loginController.trade(),
    ]);

    this.bot.use(this.loginController.middleware());
  }

  private registerConversations() {
    for (const [name, conversation] of botConversations.entries()) {
      this.bot.use(createConversation(conversation, name));
    }
  }

  public static async getInstance(apiKey?: string) {
    if (!apiKey) throw new Error("API_KEY is not defined");

    if (!MainBot.instance) {
      MainBot.instance = new MainBot(apiKey);
    }

    return MainBot.instance;
  }

  public async setup() {
    try {
      return this.bot;
    } catch (error) {
      throw new Error(error as string);
    }
  }
}
