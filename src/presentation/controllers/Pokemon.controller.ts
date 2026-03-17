import { BaseCommandController } from "./BaseCommandController.js";
import type { AppContext } from "../data/types.js";
import { Bot } from "grammy";

export class PokemonController extends BaseCommandController<AppContext> {
  constructor(bot: Bot<AppContext>) {
    super(bot);
  }

  public async pokemons() {
    const handler = async (ctx: AppContext) => {
      try {
        return await ctx.conversation.enter("pokemons");
      } catch (error) {
        super.displayError(error as Error, ctx);
      }
    };

    return this.registerCommand(
      "MY_POKEMONS",
      async (ctx: AppContext) => await handler(ctx),
    );
  }

  public async generatePokemon() {
    const handler = async (ctx: AppContext) => {
      try {
        return await ctx.conversation.enter("generatePokemon");
      } catch (error) {
        this.displayError(error as Error, ctx);
      }
    };
    return this.registerCommand(
      "POKEMON_GENERATE",
      async (ctx: AppContext) => await handler(ctx),
    );
  }

  public async evolve() {
    const handler = async (ctx: AppContext) => {
      try {
        return await ctx.conversation.enter("evolvePokemon");
      } catch (error) {
        this.displayError(error as Error, ctx);
      }
    };
    return this.registerCommand(
      "EVOLVE",
      async (ctx: AppContext) => await handler(ctx),
    );
  }

  public async shiny() {
    const handler = async (ctx: AppContext) => {
      try {
        return await ctx.conversation.enter("shinyPokemon");
      } catch (error) {
        this.displayError(error as Error, ctx);
      }
    };

    return this.registerCommand(
      "SHINY",
      async (ctx: AppContext) => await handler(ctx),
    );
  }

  public async trade() {
    const handler = async (ctx: AppContext) => {
      try {
        return await ctx.conversation.enter("trade");
      } catch (error) {
        super.displayError(error as Error, ctx);
      }
    };

    return this.registerCommand(
      "TRADE",
      async (ctx: AppContext) => await handler(ctx),
    );
  }

  public async nickname() {
    const handler = async (ctx: AppContext) => {
      try {
        return await ctx.conversation.enter("nickname");
      } catch (error) {
        super.displayError(error as Error, ctx);
      }
    };

    return this.registerCommand(
      "NICKNAME",
      async (ctx: AppContext) => await handler(ctx),
    );
  }
}
