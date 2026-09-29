import { BaseCommandController } from "./BaseCommandController.js";
import type { AppContext } from "../data/types.js";
import { Bot } from "grammy";

export class PokemonController extends BaseCommandController<AppContext> {
  constructor(bot: Bot<AppContext>) {
    super(bot);
  }

  public async pokemons() {
    return this.registerConversationCommand("MY_POKEMONS", "pokemons");
  }

  public async generatePokemon() {
    return this.registerConversationCommand("POKEMON_GENERATE", "generatePokemon");
  }

  public async evolve() {
    return this.registerConversationCommand("EVOLVE", "evolvePokemon");
  }

  public async shiny() {
    return this.registerConversationCommand("SHINY", "shinyPokemon");
  }

  public async trade() {
    return this.registerConversationCommand("TRADE", "trade");
  }

  public async nickname() {
    return this.registerConversationCommand("NICKNAME", "nickname");
  }
}
