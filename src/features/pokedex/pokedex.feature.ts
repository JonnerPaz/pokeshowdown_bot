import { Composer } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import { createConversation } from "@grammyjs/conversations";
import type { AppContext } from "../../presentation/data/types.js";
import { pokedexConversation, type PokedexConversationDeps } from "./pokedex.conversations.js";
import { registerFeatureConversationCommand } from "../common/commandHelper.js";

export function createPokedexFeature(deps: PokedexConversationDeps): Composer<AppContext> {
  const feature = new Composer<AppContext>();
  const commandGroup = new CommandGroup<AppContext>();

  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => pokedexConversation(conv, ctx, deps),
      "pokedex",
    ),
  );

  registerFeatureConversationCommand(commandGroup, "POKEDEX", "pokedex");

  feature.use(commandGroup.middleware());
  return feature;
}
