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
  formatSwapPrompt,
  formatReleaseConfirmationPrompt,
  formatReleasePickPrompt,
  getReleaseReward,
  getPokemonFrontSprite,
} from "./pokemon.service.js";
import {
  createPokemonCarouselKeyboard,
  createPartyRosterKeyboard,
  createSwapPartyKeyboard,
  createReleasePickKeyboard,
  createReleaseConfirmKeyboard,
} from "./pokemon.keyboards.js";
import { MAX_PKMN_PARTY } from "../../domain/data/constants.js";
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

  // Carousel Navigation callback listener (supports party and box modes)
  feature.callbackQuery(/^pkmn:nav:(?:(party|box):)?(\d+):(\d+)$/, async (ctx) => {
    const viewMode = (ctx.match[1] as "party" | "box") ?? "party";
    const targetIndex = Number(ctx.match[2]);
    const targetUserId = ctx.match[3]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon party! Use /pokemons or /box to view your own.",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user) {
      await ctx.answerCallbackQuery({ text: "User not registered!", show_alert: true });
      return;
    }

    const list =
      viewMode === "party" ? (user.party.length > 0 ? user.party : user.pokemons) : user.box;
    if (list.length === 0) {
      await ctx.answerCallbackQuery({
        text: viewMode === "box" ? "📦 Storage Box is empty!" : "🎒 Party is empty!",
        show_alert: true,
      });
      return;
    }

    const safeIndex = ((targetIndex % list.length) + list.length) % list.length;
    const currentPokemon = list[safeIndex]!;
    const spriteUrl = getPokemonFrontSprite(currentPokemon);
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      user,
      safeIndex,
      list.length,
      viewMode,
    );
    const reply_markup = createPokemonCarouselKeyboard(user, safeIndex, viewMode);

    await ctx.answerCallbackQuery();
    await ctx
      .editMessageMedia(InputMediaBuilder.photo(spriteUrl, { caption, parse_mode: "Markdown" }), {
        reply_markup,
      })
      .catch(() => {});
  });

  // Carousel View Mode Switch callback listener (Party <-> Box)
  feature.callbackQuery(/^pkmn:switch:(party|box):(\d+):(\d+)$/, async (ctx) => {
    const viewMode = ctx.match[1] as "party" | "box";
    const targetIndex = Number(ctx.match[2]);
    const targetUserId = ctx.match[3]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon storage! Use /pokemons or /box to view your own.",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user) return;

    const list =
      viewMode === "party" ? (user.party.length > 0 ? user.party : user.pokemons) : user.box;
    if (list.length === 0) {
      await ctx.answerCallbackQuery({
        text: viewMode === "box" ? "📦 Storage Box is currently empty!" : "🎒 Party is empty!",
        show_alert: true,
      });
      return;
    }

    const safeIndex = ((targetIndex % list.length) + list.length) % list.length;
    const currentPokemon = list[safeIndex]!;
    const spriteUrl = getPokemonFrontSprite(currentPokemon);
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      user,
      safeIndex,
      list.length,
      viewMode,
    );
    const reply_markup = createPokemonCarouselKeyboard(user, safeIndex, viewMode);

    await ctx.answerCallbackQuery();
    await ctx
      .editMessageMedia(InputMediaBuilder.photo(spriteUrl, { caption, parse_mode: "Markdown" }), {
        reply_markup,
      })
      .catch(() => {});
  });

  // Carousel Buddy Set callback listener
  feature.callbackQuery(/^pkmn:buddy:(\d+):(\d+)(?::(party|box))?:(\d+)$/, async (ctx) => {
    const pokemonId = Number(ctx.match[1]);
    const currentIndex = Number(ctx.match[2]);
    const viewMode = (ctx.match[3] as "party" | "box") ?? "party";
    const targetUserId = ctx.match[4]!;
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
        text: "Pokémon not found in your collection!",
        show_alert: true,
      });
      return;
    }

    user.buddyPokemonId = pokemonId;
    await effectiveDeps.userDataSource.updateUser(user, { buddyPokemonId: pokemonId });

    const list =
      viewMode === "party" ? (user.party.length > 0 ? user.party : user.pokemons) : user.box;
    const safeIndex = ((currentIndex % list.length) + list.length) % list.length;
    const currentPokemon = list[safeIndex]!;
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      user,
      safeIndex,
      list.length,
      viewMode,
    );
    const reply_markup = createPokemonCarouselKeyboard(user, safeIndex, viewMode);

    const pName =
      targetPokemon.nickname ??
      targetPokemon.name.charAt(0).toUpperCase() + targetPokemon.name.slice(1);

    await ctx.answerCallbackQuery({
      text: `⭐ ${pName} is now your active companion buddy!`,
      show_alert: false,
    });

    await ctx.editMessageCaption({ caption, parse_mode: "Markdown", reply_markup }).catch(() => {});
  });

  // Deposit party Pokémon into PC Storage Box
  feature.callbackQuery(/^pkmn:deposit:(\d+):(\d+)$/, async (ctx) => {
    const pokemonId = Number(ctx.match[1]);
    const targetUserId = ctx.match[2]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon party!",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user) return;

    if (user.party.length <= 1) {
      await ctx.answerCallbackQuery({
        text: "🚫 You cannot deposit your last party Pokémon! Keep at least 1 in your party.",
        show_alert: true,
      });
      return;
    }

    await effectiveDeps.pokemonDataSource.setPokemonPartyStatus(pokemonId, false);
    const refreshed = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!refreshed || refreshed.party.length === 0) return;

    const currentPokemon = refreshed.party[0]!;
    const spriteUrl = getPokemonFrontSprite(currentPokemon);
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      refreshed,
      0,
      refreshed.party.length,
      "party",
    );
    const reply_markup = createPokemonCarouselKeyboard(refreshed, 0, "party");

    await ctx.answerCallbackQuery({
      text: "⬇️ Pokémon sent to your PC Storage Box! 📦",
      show_alert: false,
    });

    await ctx
      .editMessageMedia(InputMediaBuilder.photo(spriteUrl, { caption, parse_mode: "Markdown" }), {
        reply_markup,
      })
      .catch(() => {});
  });

  // Withdraw boxed Pokémon into active Battle Party
  feature.callbackQuery(/^pkmn:withdraw:(\d+):(\d+)$/, async (ctx) => {
    const pokemonId = Number(ctx.match[1]);
    const targetUserId = ctx.match[2]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon box!",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user) return;

    if (user.party.length >= MAX_PKMN_PARTY) {
      await ctx.answerCallbackQuery({
        text: "🚫 Your battle party is already full (6/6)! Use Swap instead.",
        show_alert: true,
      });
      return;
    }

    await effectiveDeps.pokemonDataSource.setPokemonPartyStatus(pokemonId, true);
    const refreshed = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!refreshed) return;

    await ctx.answerCallbackQuery({
      text: "⬆️ Pokémon moved into your active Battle Party! ✨",
      show_alert: false,
    });

    if (refreshed.box.length > 0) {
      const currentPokemon = refreshed.box[0]!;
      const spriteUrl = getPokemonFrontSprite(currentPokemon);
      const caption = formatPokemonCarouselCard(
        currentPokemon,
        refreshed,
        0,
        refreshed.box.length,
        "box",
      );
      const reply_markup = createPokemonCarouselKeyboard(refreshed, 0, "box");
      await ctx
        .editMessageMedia(InputMediaBuilder.photo(spriteUrl, { caption, parse_mode: "Markdown" }), {
          reply_markup,
        })
        .catch(() => {});
    } else {
      const currentPokemon = refreshed.party[0]!;
      const spriteUrl = getPokemonFrontSprite(currentPokemon);
      const caption = formatPokemonCarouselCard(
        currentPokemon,
        refreshed,
        0,
        refreshed.party.length,
        "party",
      );
      const reply_markup = createPokemonCarouselKeyboard(refreshed, 0, "party");
      await ctx
        .editMessageMedia(InputMediaBuilder.photo(spriteUrl, { caption, parse_mode: "Markdown" }), {
          reply_markup,
        })
        .catch(() => {});
    }
  });

  // Pick party member to swap with boxed Pokémon
  feature.callbackQuery(/^pkmn:swap:pick:(\d+):(\d+)$/, async (ctx) => {
    const boxPokemonId = Number(ctx.match[1]);
    const targetUserId = ctx.match[2]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon box!",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user) return;

    const boxPokemon = user.box.find((p) => p.id === boxPokemonId);
    if (!boxPokemon) {
      await ctx.answerCallbackQuery({ text: "Boxed Pokémon not found!", show_alert: true });
      return;
    }

    const caption = formatSwapPrompt(boxPokemon);
    const reply_markup = createSwapPartyKeyboard(boxPokemonId, user.party, targetUserId);

    await ctx.answerCallbackQuery();
    await ctx.editMessageCaption({ caption, parse_mode: "Markdown", reply_markup }).catch(() => {});
  });

  // Execute atomic swap between boxed Pokémon and party Pokémon
  feature.callbackQuery(/^pkmn:swap:do:(\d+):(\d+):(\d+)$/, async (ctx) => {
    const boxPokemonId = Number(ctx.match[1]);
    const partyPokemonId = Number(ctx.match[2]);
    const targetUserId = ctx.match[3]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon box!",
        show_alert: true,
      });
      return;
    }

    await effectiveDeps.pokemonDataSource.swapPokemonPartyStatus(boxPokemonId, partyPokemonId);
    const refreshed = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!refreshed || refreshed.party.length === 0) return;

    await ctx.answerCallbackQuery({
      text: "🔄 Successfully swapped Pokémon! ✨",
      show_alert: false,
    });

    const targetIdx = refreshed.party.findIndex((p) => p.id === boxPokemonId);
    const safeIdx = targetIdx !== -1 ? targetIdx : 0;
    const currentPokemon = refreshed.party[safeIdx]!;
    const spriteUrl = getPokemonFrontSprite(currentPokemon);
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      refreshed,
      safeIdx,
      refreshed.party.length,
      "party",
    );
    const reply_markup = createPokemonCarouselKeyboard(refreshed, safeIdx, "party");

    await ctx
      .editMessageMedia(InputMediaBuilder.photo(spriteUrl, { caption, parse_mode: "Markdown" }), {
        reply_markup,
      })
      .catch(() => {});
  });

  // Release Confirmation Prompt callback listener
  feature.callbackQuery(/^pkmn:rel:ask:(\d+):(\d+):(party|box):(\d+)$/, async (ctx) => {
    const pokemonId = Number(ctx.match[1]);
    const currentIndex = Number(ctx.match[2]);
    const viewMode = ctx.match[3] as "party" | "box";
    const targetUserId = ctx.match[4]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon party! Use /pokemons or /box to view your own.",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user) return;

    if (user.pokemons.length <= 1) {
      await ctx.answerCallbackQuery({
        text: "🚫 You cannot release your only Pokémon! You must keep at least 1 companion with you.",
        show_alert: true,
      });
      return;
    }

    const targetPokemon = user.pokemons.find((p) => p.id === pokemonId);
    if (!targetPokemon) {
      await ctx.answerCallbackQuery({
        text: "Pokémon not found in your collection!",
        show_alert: true,
      });
      return;
    }

    const caption = formatReleaseConfirmationPrompt(targetPokemon);
    const reply_markup = createReleaseConfirmKeyboard(
      pokemonId,
      currentIndex,
      viewMode,
      targetUserId,
    );

    await ctx.answerCallbackQuery();
    await ctx.editMessageCaption({ caption, parse_mode: "Markdown", reply_markup }).catch(() => {});
  });

  // Execute Release and Grant Pokéball Rewards callback listener
  feature.callbackQuery(/^pkmn:rel:do:(\d+):(\d+):(party|box):(\d+)$/, async (ctx) => {
    const pokemonId = Number(ctx.match[1]);
    const currentIndex = Number(ctx.match[2]);
    const viewMode = ctx.match[3] as "party" | "box";
    const targetUserId = ctx.match[4]!;
    const callerId = String(ctx.from?.id);

    if (callerId !== targetUserId) {
      await ctx.answerCallbackQuery({
        text: "🚫 This is not your Pokémon party!",
        show_alert: true,
      });
      return;
    }

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!user) return;

    if (user.pokemons.length <= 1) {
      await ctx.answerCallbackQuery({
        text: "🚫 You cannot release your only Pokémon!",
        show_alert: true,
      });
      return;
    }

    const targetPokemon = user.pokemons.find((p) => p.id === pokemonId);
    if (!targetPokemon) return;

    const reward = getReleaseReward(targetPokemon);
    const newPokeballs = user.pokeballs + reward.pokeballs;
    const newGreatballs = user.greatballs + reward.greatballs;
    const newBuddyId = user.buddyPokemonId === pokemonId ? null : user.buddyPokemonId;

    await effectiveDeps.pokemonDataSource.deletePokemon(pokemonId);
    await effectiveDeps.userDataSource.updateUser(user, {
      pokeballs: newPokeballs,
      greatballs: newGreatballs,
      buddyPokemonId: newBuddyId,
    });

    const pName =
      targetPokemon.nickname ??
      targetPokemon.name.charAt(0).toUpperCase() + targetPokemon.name.slice(1);

    await ctx.answerCallbackQuery({
      text: `👋 Bye-bye, ${pName}! Professor Oak rewarded you with ${reward.text}! 🎒`,
      show_alert: true,
    });

    const refreshed = await effectiveDeps.userDataSource.findUserByTelegramId(ctx.from!.id);
    if (!refreshed || refreshed.pokemons.length === 0) return;

    const list =
      viewMode === "party"
        ? refreshed.party.length > 0
          ? refreshed.party
          : refreshed.box
        : refreshed.box.length > 0
          ? refreshed.box
          : refreshed.party;
    const targetMode =
      viewMode === "party"
        ? refreshed.party.length > 0
          ? "party"
          : "box"
        : refreshed.box.length > 0
          ? "box"
          : "party";

    const safeIndex = ((currentIndex % list.length) + list.length) % list.length;
    const currentPokemon = list[safeIndex]!;
    const spriteUrl = getPokemonFrontSprite(currentPokemon);
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      refreshed,
      safeIndex,
      list.length,
      targetMode,
    );
    const reply_markup = createPokemonCarouselKeyboard(refreshed, safeIndex, targetMode);

    await ctx
      .editMessageMedia(InputMediaBuilder.photo(spriteUrl, { caption, parse_mode: "Markdown" }), {
        reply_markup,
      })
      .catch(() => {});
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

    const party = user.party.length > 0 ? user.party : user.pokemons;
    // Start carousel at active buddy or first pokemon in party
    const buddyIndex =
      user.buddyPokemonId !== null && user.buddyPokemonId !== undefined
        ? party.findIndex((p) => p.id === user.buddyPokemonId)
        : -1;
    const initialIndex = buddyIndex !== -1 ? buddyIndex : 0;
    const currentPokemon = party[initialIndex]!;

    const spriteUrl = getPokemonFrontSprite(currentPokemon);
    const caption = formatPokemonCarouselCard(
      currentPokemon,
      user,
      initialIndex,
      party.length,
      "party",
    );
    const reply_markup = createPokemonCarouselKeyboard(user, initialIndex, "party");

    await ctx.replyWithPhoto(spriteUrl, {
      caption,
      parse_mode: "Markdown",
      reply_markup,
    });
  });

  // Mount /box PC Storage Box command
  registerFeatureCommand(commandGroup, "BOX", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(userId);
    if (!user) {
      await ctx.reply("You are not registered! Use /start or /register to begin your journey.");
      return;
    }

    if (user.box.length === 0) {
      await ctx.reply(
        "📦 *Your PC Storage Box is empty!*\n\nWhen your battle party is full (6/6), newly caught Pokémon are automatically sent here. You can also send party members to your box using /pokemons.",
        { parse_mode: "Markdown" },
      );
      return;
    }

    const currentPokemon = user.box[0]!;
    const spriteUrl = getPokemonFrontSprite(currentPokemon);
    const caption = formatPokemonCarouselCard(currentPokemon, user, 0, user.box.length, "box");
    const reply_markup = createPokemonCarouselKeyboard(user, 0, "box");

    await ctx.replyWithPhoto(spriteUrl, {
      caption,
      parse_mode: "Markdown",
      reply_markup,
    });
  });

  // Mount /release command
  registerFeatureCommand(commandGroup, "RELEASE", async (ctx) => {
    const userId = ctx.from?.id;
    if (!userId) return;

    const user = await effectiveDeps.userDataSource.findUserByTelegramId(userId);
    if (!user) {
      await ctx.reply("You are not registered! Use /start or /register to begin your journey.");
      return;
    }

    if (user.pokemons.length <= 1) {
      await ctx.reply(
        "🚫 *You cannot release your only Pokémon!*\nYou must always keep at least 1 companion with you on your journey.",
        { parse_mode: "Markdown" },
      );
      return;
    }

    const caption = formatReleasePickPrompt();
    const reply_markup = createReleasePickKeyboard(user);

    await ctx.reply(caption, {
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
