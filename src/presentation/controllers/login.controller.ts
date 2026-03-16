import type { AppContext } from "../data/types.js";
import { Bot } from "grammy";
import { getAllCommands } from "./commands.js";
import { CommandGroup, LanguageCodes } from "@grammyjs/commands";
import { BaseCommandController } from "./BaseCommandController.js";

type T = AppContext;

export class LoginController extends BaseCommandController<AppContext> {
  public botCommands = new CommandGroup();

  constructor(public bot: Bot<T>) {
    super(bot);
  }

  public async start() {
    const handler = async (ctx: T) => {
      try {
        return await ctx.conversation.enter("start");
      } catch (error) {
        console.error(error);
        await ctx.reply("There was an error during request. Please report it");
      }
    };

    return this.useCommand("START", async (ctx: T) => await handler(ctx));
  }

  public async register() {
    const handler = async (ctx: T) => {
      try {
        await ctx.conversation.enter("register");
      } catch (error) {
        console.error(error);
        await ctx.reply("There was an error during request. Please report it");
      }
    };

    return this.useCommand("REGISTER", async (ctx: T) => await handler(ctx));
  }

  public async help() {
    const handler = async (ctx: T) => {
      try {
        let msg = `List of commands of @${ctx.me.username}:\n`;
        getAllCommands().forEach((command) => {
          msg += `/${command.command} - ${command.description}\n`;
        });
        await ctx.reply(msg + "\nFor more information, type /start");
      } catch (error) {
        ctx.reply("There was an error during request. Please report it");
        console.error(error);
        throw error;
      }
    };

    return this.useCommand("HELP", async (ctx: T) => await handler(ctx));
  }

  public async deleteAccount() {
    const handler = async (ctx: T) => {
      try {
        await ctx.conversation.enter("deleteAccount");
      } catch (error) {
        console.error(error);
        await ctx.reply("There was an error during request. Please report it");
      }
    };
    return this.useCommand(
      "DELETE_ACCOUNT",
      async (ctx: T) => await handler(ctx),
    );
  }

  public async pokemons() {
    const handler = async (ctx: T) => {
      try {
        return await ctx.conversation.enter("pokemons");
      } catch (error) {
        console.error(error);
        await ctx.reply("There was an error during request. Please report it");
      }
    };

    return this.useCommand("MY_POKEMONS", async (ctx: T) => await handler(ctx));
  }

  public async generatePokemon() {
    const handler = async (ctx: T) => {
      try {
        return await ctx.conversation.enter("generatePokemon");
      } catch (error) {
        console.error(error);
        await ctx.reply("There was an error during request. Please report it");
      }
    };
    return this.useCommand(
      "POKEMON_GENERATE",
      async (ctx: T) => await handler(ctx),
    );
  }

  public async evolve() {
    const handler = async (ctx: T) => {
      try {
        return await ctx.conversation.enter("evolvePokemon");
      } catch (error) {
        console.error(error);
        await ctx.reply("There was an error during request. Please report it");
      }
    };
    return this.useCommand("EVOLVE", async (ctx: T) => await handler(ctx));
  }

  public async trade() {
    const handler = async (ctx: T) => {
      try {
        return await ctx.conversation.enter("trade");
      } catch (error) {
        console.error(error);
        await ctx.reply("There was an error during request. Please report it");
      }
    };

    return this.useCommand("TRADE", async (ctx: T) => await handler(ctx));
  }

  public async registerBotMenuCommands(): Promise<void> {
    await this.bot.api.setMyCommands(getAllCommands(LanguageCodes.English));

    await this.bot.api.setMyCommands(getAllCommands(LanguageCodes.Spanish), {
      language_code: LanguageCodes.Spanish,
    });
  }
}
