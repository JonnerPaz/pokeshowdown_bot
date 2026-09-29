import { Composer } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import { createConversation } from "@grammyjs/conversations";
import type { AppContext } from "../../presentation/data/types.js";
import type { PokemonConversationDeps } from "./pokemon.conversations.js";
import {
  pokemonsConversation,
  generatePokemonConversation,
  evolvePokemonConversation,
  shinyPokemonConversation,
  tradeConversation,
  nicknameConversation,
} from "./pokemon.conversations.js";
import { registerFeatureConversationCommand } from "../common/commandHelper.js";

export function createPokemonFeature(deps: PokemonConversationDeps): Composer<AppContext> {
  const feature = new Composer<AppContext>();
  const commandGroup = new CommandGroup<AppContext>();

  // Mount conversations
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => pokemonsConversation(conv, ctx, deps),
      "pokemons",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => generatePokemonConversation(conv, ctx, deps),
      "generatePokemon",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => evolvePokemonConversation(conv, ctx, deps),
      "evolvePokemon",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => shinyPokemonConversation(conv, ctx, deps),
      "shinyPokemon",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => tradeConversation(conv, ctx, deps),
      "trade",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => nicknameConversation(conv, ctx, deps),
      "nickname",
    ),
  );

  // Mount commands
  registerFeatureConversationCommand(commandGroup, "MY_POKEMONS", "pokemons");
  registerFeatureConversationCommand(commandGroup, "POKEMON_GENERATE", "generatePokemon");
  registerFeatureConversationCommand(commandGroup, "EVOLVE", "evolvePokemon");
  registerFeatureConversationCommand(commandGroup, "SHINY", "shinyPokemon");
  registerFeatureConversationCommand(commandGroup, "TRADE", "trade");
  registerFeatureConversationCommand(commandGroup, "NICKNAME", "nickname");

  feature.use(commandGroup.middleware());
  return feature;
}
