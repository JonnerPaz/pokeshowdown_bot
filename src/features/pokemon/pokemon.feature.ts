import { Composer, InlineKeyboard, InputMediaBuilder } from "grammy";
import { CommandGroup } from "@grammyjs/commands";
import { createConversation } from "@grammyjs/conversations";
import type { AppContext } from "../../presentation/data/types.js";
import type { PokemonConversationDeps } from "./pokemon.conversations.js";
import type { BallType } from "../../domain/items/ballTypes.js";
import { GroupEncounterService } from "./groupEncounter.service.js";
import {
  generatePokemonConversation,
  evolvePokemonConversation,
  shinyPokemonConversation,
  tradeConversation,
  nicknameConversation,
} from "./pokemon.conversations.js";
import {
  formatPokemonCarouselCard,
  formatPartyRosterText,
  getPokemonFrontSprite,
} from "./pokemon.service.js";
import { createPokemonCarouselKeyboard, createPartyRosterKeyboard } from "./pokemon.keyboards.js";
import {
  registerFeatureCommand,
  registerFeatureConversationCommand,
} from "../common/commandHelper.js";

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

  // Carousel Navigation callback listener
  feature.callbackQuery(/^pkmn:nav:(\d+):(\d+)$/, async (ctx) => {
    const targetIndex = Number(ctx.match[1]);
    const targetUserId = ctx.match[2]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon party! Use /pokemons to view your own.",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user || user.pokemons.length === 0) {
      await ctx.answerCallbackQuery({ text: "No Pokémon found in party!", show_alert: true });
      return;
    }

    const safeIndex =
      ((targetIndex % user.pokemons.length) + user.pokemons.length) % user.pokemons.length;
    const currentPokemon = user.pokemons[safeIndex]!;
    const spriteUrl = getPokemonFrontSprite(currentPokemon);
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      user,
      safeIndex,
      user.pokemons.length,
    );
    const reply_markup = createPokemonCarouselKeyboard(user, safeIndex);

    await ctx.answerCallbackQuery();
    await ctx
      .editMessageMedia(InputMediaBuilder.photo(spriteUrl, { caption, parse_mode: "Markdown" }), {
        reply_markup,
      })
      .catch(() => {});
  });

  // Carousel Buddy Set callback listener
  feature.callbackQuery(/^pkmn:buddy:(\d+):(\d+):(\d+)$/, async (ctx) => {
    const pokemonId = Number(ctx.match[1]);
    const currentIndex = Number(ctx.match[2]);
    const targetUserId = ctx.match[3]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon party! Use /pokemons to view your own.",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user || user.pokemons.length === 0) return;

    const targetPokemon = user.pokemons.find((p) => p.id === pokemonId);
    if (!targetPokemon) {
      await ctx.answerCallbackQuery({
        text: "Pokémon not found in your party!",
        show_alert: true,
      });
      return;
    }

    user.buddyPokemonId = pokemonId;
    await effectiveDeps.userDataSource.updateUser(user, { buddyPokemonId: pokemonId });

    const safeIndex =
      ((currentIndex % user.pokemons.length) + user.pokemons.length) % user.pokemons.length;
    const currentPokemon = user.pokemons[safeIndex]!;
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      user,
      safeIndex,
      user.pokemons.length,
    );
    const reply_markup = createPokemonCarouselKeyboard(user, safeIndex);

    const pName =
      targetPokemon.nickname ??
      targetPokemon.name.charAt(0).toUpperCase() + targetPokemon.name.slice(1);

    await ctx.answerCallbackQuery({
      text: `⭐ ${pName} is now your active companion buddy!`,
      show_alert: false,
    });

    await ctx.editMessageCaption({ caption, parse_mode: "Markdown", reply_markup }).catch(() => {});
  });

  // Carousel Roster Overview callback listener
  feature.callbackQuery(/^pkmn:roster:(\d+):(\d+)$/, async (ctx) => {
    const currentIndex = Number(ctx.match[1]);
    const targetUserId = ctx.match[2]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon party! Use /pokemons to view your own.",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user || user.pokemons.length === 0) return;

    const rosterCaption = formatPartyRosterText(user);
    const reply_markup = createPartyRosterKeyboard(user, currentIndex);

    await ctx.answerCallbackQuery();
    await ctx
      .editMessageCaption({
        caption: rosterCaption,
        parse_mode: "Markdown",
        reply_markup,
      })
      .catch(() => {});
  });

  // No-op callback listener (e.g. for page indicator buttons)
  feature.callbackQuery("pkmn:noop", async (ctx) => {
    await ctx.answerCallbackQuery();
  });

  // Mount conversations
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

  // Fallback catch listener for expired or orphaned encounters
  feature.callbackQuery(/^catch(:.+)?$/, async (ctx) => {
    await ctx.answerCallbackQuery({
      text: "💨 This wild Pokémon has already fled! Use /generate_pokemon to find another.",
      show_alert: true,
    });
    await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() }).catch(() => {});
  });

  // Mount /pokemons interactive carousel command
  registerFeatureCommand(commandGroup, "MY_POKEMONS", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(userId);
    if (!user) {
      await ctx.reply("You are not registered! Use /start or /register to begin your journey.");
      return;
    }

    if (user.pokemons.length === 0) {
      await ctx.reply(
        "You don't have any pokemon yet! Use /generate_pokemon to find wild pokemon.",
      );
      return;
    }

    // Start carousel at active buddy or first pokemon
    const buddyIndex =
      user.buddyPokemonId !== null && user.buddyPokemonId !== undefined
        ? user.pokemons.findIndex((p) => p.id === user.buddyPokemonId)
        : -1;
    const initialIndex = buddyIndex !== -1 ? buddyIndex : 0;
    const currentPokemon = user.pokemons[initialIndex]!;

    const spriteUrl = getPokemonFrontSprite(currentPokemon);
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      user,
      initialIndex,
      user.pokemons.length,
    );
    const reply_markup = createPokemonCarouselKeyboard(user, initialIndex);

    await ctx.replyWithPhoto(spriteUrl, {
      caption,
      parse_mode: "Markdown",
      reply_markup,
    });
  });

  // Mount conversation commands
  registerFeatureConversationCommand(commandGroup, "POKEMON_GENERATE", "generatePokemon");
  registerFeatureConversationCommand(commandGroup, "EVOLVE", "evolvePokemon");
  registerFeatureConversationCommand(commandGroup, "SHINY", "shinyPokemon");
  registerFeatureConversationCommand(commandGroup, "TRADE", "trade");
  registerFeatureConversationCommand(commandGroup, "NICKNAME", "nickname");

  feature.use(commandGroup.middleware());
  return feature;
}
