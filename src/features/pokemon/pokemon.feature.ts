import { Composer } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import { createConversation } from "@grammyjs/conversations";
import type { AppContext } from "../../presentation/data/types.js";
import type { PokemonConversationDeps } from "./pokemon.conversations.js";
import type { BallType } from "../../domain/items/ballTypes.js";
import { GroupEncounterService } from "./groupEncounter.service.js";
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

  const groupEncounterService = deps.groupEncounterService ?? new GroupEncounterService();
  const effectiveDeps: PokemonConversationDeps = {
    ...deps,
    groupEncounterService,
  };

  // Group chat spontaneous spawn tracking
  feature.on("message", async (ctx, next) => {
    const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
    if (isGroup && ctx.chat) {
      const shouldSpawn = groupEncounterService.trackMessage(ctx.chat.id, ctx.from?.id);
      if (shouldSpawn) {
        await groupEncounterService
          .spawnGroupPokemon(ctx.api, ctx.chat.id, { pokeApi: deps.pokeApi })
          .catch((err) => {
            console.error("Spontaneous group spawn failed:", err);
          });
      }
    }
    await next();
  });

  // Group catch callback query listener
  feature.callbackQuery(
    /^gcatch:([a-zA-Z0-9_-]+):(pokeball|greatball|ultraball|masterball)$/,
    async (ctx) => {
      const encounterId = ctx.match[1]!;
      const ballType = ctx.match[2]! as BallType;
      await groupEncounterService.handleGroupCatchAttempt(
        ctx,
        encounterId,
        ballType,
        effectiveDeps,
      );
    },
  );

  // Mount conversations
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => pokemonsConversation(conv, ctx, effectiveDeps),
      "pokemons",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => generatePokemonConversation(conv, ctx, effectiveDeps),
      "generatePokemon",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => evolvePokemonConversation(conv, ctx, effectiveDeps),
      "evolvePokemon",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => shinyPokemonConversation(conv, ctx, effectiveDeps),
      "shinyPokemon",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => tradeConversation(conv, ctx, effectiveDeps),
      "trade",
    ),
  );
  feature.use(
    createConversation<AppContext, AppContext>(
      (conv, ctx) => nicknameConversation(conv, ctx, effectiveDeps),
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
