import { randomUUID } from "node:crypto";
import { InputMediaBuilder } from "grammy";
import type { InputMediaPhoto } from "grammy/types";
import type { AppContext, AppConversation } from "../../presentation/data/types.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import type { RateLimiterService } from "../../presentation/services/rateLimiter.service.js";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import {
  CONVERSATION_TIMEOUT_MS,
  EVOLVE_CAP,
  MAX_PKMN_PARTY,
  SHINY_CAP,
} from "../../domain/data/constants.js";
import { escapeMarkdown } from "../common/stringHelper.js";
import { isGroupChat } from "../common/chatHelper.js";
import {
  buildPokemonSummaryCaption,
  evolvePokemonOperation,
  getPokemonFrontSprite,
} from "./pokemon.service.js";
import type { GroupEncounterService } from "./groupEncounter.service.js";
import {
  createCatchKeyboard,
  createTradeConfirmKeyboard,
  createTradeInviteKeyboard,
} from "./pokemon.keyboards.js";
import {
  BALL_CONFIGS,
  type BallType,
  getBallUserField,
  getUserBallCount,
  rollCatchAttempt,
  rollFlee,
} from "../../domain/items/ballTypes.js";

export interface PokemonConversationDeps {
  userDataSource: UserDataSource;
  pokemonDataSource: PokemonDataSource;
  pokeApi: PokeApiService;
  rateLimiter: RateLimiterService;
  groupEncounterService?: GroupEncounterService;
}

export { getPokemonFrontSprite };

export async function sendPokemonPhotos(
  ctx: AppContext,
  photos: InputMediaPhoto[],
): Promise<Array<{ message_id: number }>> {
  if (photos.length === 0) return [];
  const single = photos[0];
  if (photos.length === 1 && single) {
    const sent = await ctx.api.sendPhoto(ctx.chat!.id, single.media);
    return [sent];
  }

  const results: Array<{ message_id: number }> = [];
  const MAX_PER_GROUP = 10;
  for (let i = 0; i < photos.length; i += MAX_PER_GROUP) {
    const chunk = photos.slice(i, i + MAX_PER_GROUP);
    const sentGroup = await ctx.api.sendMediaGroup(ctx.chat!.id, chunk);
    results.push(...sentGroup);
  }
  return results;
}

async function checkUserExists(
  userId: number,
  conv: AppConversation,
  ctx: AppContext,
  userDataSource: UserDataSource,
): Promise<UserEntity | null> {
  const user = await conv.external(() => userDataSource.findUserByTelegramId(userId));
  if (!user) {
    await ctx.reply("You are not registered!");
    return null;
  }
  return user;
}

export async function pokemonsConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: Pick<PokemonConversationDeps, "userDataSource">,
) {
  const user = await conv.external(() => deps.userDataSource.findUserByTelegramId(ctx.from!.id));

  if (!user) {
    await ctx.reply("You are not registered!");
    return;
  }

  if (user.pokemons.length === 0) {
    await ctx.reply("You don't have any pokemon yet!");
    return;
  }

  const pokemonPhotos = user.pokemons.map((el) =>
    InputMediaBuilder.photo(getPokemonFrontSprite(el)),
  );

  await ctx.reply("Your pokemons are:");
  await sendPokemonPhotos(ctx, pokemonPhotos);
  return;
}

export async function pokemonSummaryConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: Pick<PokemonConversationDeps, "userDataSource" | "pokeApi">,
) {
  const user = await checkUserExists(ctx.from!.id, conv, ctx, deps.userDataSource);
  if (!user) return;

  if (user.pokemons.length === 0) {
    await ctx.reply("You don't have any pokemon yet! Catch one with /generate_pokemon.");
    return;
  }

  let target = (ctx.message?.text ?? "").split(/\s+/).slice(1).join(" ").trim();

  if (!target) {
    const roster = user.pokemons
      .map((el) => (el.nickname ? `${el.nickname} (${el.name})` : el.name))
      .join(", ");
    await ctx.reply(
      `Which pokemon do you want a summary of? Send its name or nickname.\nYour pokemons: ${roster}`,
    );

    const answer = await conv
      .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
      .andFor(":text")
      .unless((c) => Boolean(c.message?.text?.startsWith("/")), { next: true });
    target = answer.message?.text?.trim() ?? "";
  }

  if (!target) {
    await ctx.reply("Pokemon summary cancelled.");
    return;
  }

  const query = target.toLowerCase();
  const pokemon = user.pokemons.find(
    (el) => el.name.toLowerCase() === query || el.nickname?.toLowerCase() === query,
  );

  if (!pokemon) {
    await ctx.reply(`You don't have a pokemon named "${escapeMarkdown(target)}".`);
    return;
  }

  const baseStats = await conv.external(() => deps.pokeApi.getPokemonBaseStats(pokemon.name));
  const caption = buildPokemonSummaryCaption(pokemon, baseStats);

  try {
    const sprite = getPokemonFrontSprite(pokemon);
    if (sprite) {
      await ctx.api.sendPhoto(ctx.chat!.id, sprite, { caption, parse_mode: "Markdown" });
      return;
    }
  } catch {
    // Fall back to a text-only summary if the photo cannot be delivered.
  }

  await ctx.reply(caption, { parse_mode: "Markdown" });
}

export async function generatePokemonConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: PokemonConversationDeps,
) {
  const userId = ctx.from!.id;
  const canSpawn = await conv.external(() => {
    if (!deps.rateLimiter.isAllowed(userId, "spawn")) return false;
    deps.rateLimiter.hit(userId, "spawn");
    return true;
  });

  if (!canSpawn) {
    await ctx.reply("Slow down! You're spawning too many pokemon.");
    return;
  }

  const user = await conv.external(() => deps.userDataSource.findUserByTelegramId(userId));
  if (!user || !user.id) {
    await ctx.reply("You are not registered!");
    return;
  }

  const isGroup = ctx.chat?.type === "group" || ctx.chat?.type === "supergroup";
  if (isGroup && deps.groupEncounterService) {
    await conv.external(async () => {
      await deps.groupEncounterService!.spawnGroupPokemon(ctx.api, ctx.chat!.id, {
        pokeApi: deps.pokeApi,
      });
    });
    return;
  }

  const currentPokemon = await conv.external(() => deps.pokeApi.createPokemon());
  const captureRate = await conv.external(() =>
    deps.pokeApi.getPokemonCaptureRate(currentPokemon.name),
  );

  const timeoutSec = Math.round(CONVERSATION_TIMEOUT_MS / 1000);
  const escapedWildName = escapeMarkdown(currentPokemon.name);
  const photoMsg = await ctx.api.sendPhoto(ctx.chat!.id, getPokemonFrontSprite(currentPokemon));
  const promptMsg = await ctx.reply(
    `A wild *${escapedWildName}* appeared! Choose a Pokéball to throw (⏳ ${timeoutSec}s):`,
    {
      reply_markup: createCatchKeyboard(user),
      parse_mode: "Markdown",
    },
  );

  while (true) {
    const choice = await conv
      .waitForCallbackQuery(/^catch(:.+)?$/, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
      .andFrom(ctx.from!);

    const data = choice.callbackQuery.data;
    if (data === "catch:run") {
      await choice.answerCallbackQuery({ text: "You fled safely!" });
      await ctx.api.deleteMessage(choice.chat!.id, photoMsg.message_id).catch(() => {});
      await ctx.api.deleteMessage(choice.chat!.id, promptMsg.message_id).catch(() => {});
      await ctx.reply(`🏃 You ran away safely from the wild ${currentPokemon.name}!`);
      return;
    }

    const ballType: BallType =
      data === "catch" || data === "catch:pokeball"
        ? "pokeball"
        : (data.replace("catch:", "") as BallType);

    const count = getUserBallCount(user, ballType);
    if (count <= 0) {
      const ballConfig = BALL_CONFIGS[ballType];
      await choice.answerCallbackQuery({
        text: `You don't have any ${ballConfig.name}s left!`,
        show_alert: true,
      });
      continue;
    }

    const canCatch = await conv.external(() => {
      if (!deps.rateLimiter.isAllowed(userId, "catch")) return false;
      deps.rateLimiter.hit(userId, "catch");
      return true;
    });

    // Rate-limited: keep the encounter alive and let the trainer throw again shortly
    // instead of aborting the conversation and stranding the wild Pokémon messages.
    if (!canCatch) {
      await choice.answerCallbackQuery({
        text: "Slow down! You're throwing balls too quickly. Try again in a moment.",
        show_alert: true,
      });
      continue;
    }

    await choice.answerCallbackQuery();

    // Deduct ball from inventory atomically (mirror locally so the keyboard renders fresh counts).
    const field = getBallUserField(ballType);
    user[field] -= 1;
    await conv.external(() => deps.userDataSource.decrementBall(user, ballType));

    const doesPokemonExist = await conv.external(() =>
      deps.pokemonDataSource.findUserPokemonByNameAndVariant(
        user.id!,
        currentPokemon.name,
        currentPokemon.isShiny,
      ),
    );

    const attempt = await conv.external(() => rollCatchAttempt(captureRate, ballType));
    if (attempt.caught) {
      await ctx.api.deleteMessage(choice.chat!.id, photoMsg.message_id).catch(() => {});
      await ctx.api.deleteMessage(choice.chat!.id, promptMsg.message_id).catch(() => {});

      if (doesPokemonExist) {
        await conv.external(() =>
          deps.pokemonDataSource.updatePokemon(doesPokemonExist, {
            timesCaught: doesPokemonExist.timesCaught + 1,
          }),
        );
        await ctx.reply(
          `🎉 Gotcha! @${user.username} caught ${currentPokemon.isShiny ? "a shiny " : ""}${currentPokemon.name} using a ${BALL_CONFIGS[ballType].name}! (Catches: ${doesPokemonExist.timesCaught + 1})`,
        );
      } else {
        const userPokemons = user.pokemons ?? [];
        const party = userPokemons.filter((p) => p.isInParty !== false);
        const goesToParty = party.length < MAX_PKMN_PARTY;
        currentPokemon.isInParty = goesToParty;
        await conv.external(() => deps.pokemonDataSource.createPokemon(currentPokemon, user));

        if (goesToParty) {
          await ctx.reply(
            `🎉 Gotcha! @${user.username} caught ${currentPokemon.isShiny ? "a shiny " : ""}${currentPokemon.name} using a ${BALL_CONFIGS[ballType].name}! Added to your battle party (${party.length + 1}/${MAX_PKMN_PARTY})! ✨`,
          );
        } else {
          await ctx.reply(
            `🎉 Gotcha! @${user.username} caught ${currentPokemon.isShiny ? "a shiny " : ""}${currentPokemon.name} using a ${BALL_CONFIGS[ballType].name}!\n\n📦 Your battle party is full (${MAX_PKMN_PARTY}/${MAX_PKMN_PARTY}), so ${currentPokemon.name} was safely sent to your PC Storage Box! Use /box to view and manage your storage.`,
          );
        }
      }
      return;
    }

    // Did not catch - check if wild Pokémon flees
    const fled = await conv.external(() => rollFlee());
    if (fled) {
      await ctx.api.deleteMessage(choice.chat!.id, photoMsg.message_id).catch(() => {});
      await ctx.api.deleteMessage(choice.chat!.id, promptMsg.message_id).catch(() => {});
      await ctx.reply(
        `💥 Oh no! The wild ${currentPokemon.name} broke free from the ${BALL_CONFIGS[ballType].name} and fled into the wild! 💨`,
      );
      return;
    }

    // Broke free, but stayed!
    await ctx.api.editMessageText(
      choice.chat!.id,
      promptMsg.message_id,
      `💥 The wild *${escapedWildName}* broke free! It's watching you cautiously.\nChoose another Pokéball to throw (⏳ ${timeoutSec}s):`,
      {
        reply_markup: createCatchKeyboard(user),
        parse_mode: "Markdown",
      },
    );
  }
}

export async function evolvePokemonConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: Pick<PokemonConversationDeps, "userDataSource" | "pokemonDataSource" | "pokeApi">,
) {
  const user = await checkUserExists(ctx.from!.id, conv, ctx, deps.userDataSource);
  if (!user) return;

  const pokemonNames = user.pokemons.map((el) => el.name);
  const pokemonPhotos = user.pokemons.map((el) =>
    InputMediaBuilder.photo(getPokemonFrontSprite(el)),
  );

  await sendPokemonPhotos(ctx, pokemonPhotos);
  await ctx.reply(
    `Which pokemon do you want to evolve? send a message with the name of the pokemon you want to evolve. Your pokemons: ${pokemonNames.join(", ")}`,
  );

  const choice = await conv
    .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
    .andFor(":text")
    .unless((c) => Boolean(c.message?.text?.startsWith("/")), { next: true });
  const pokemon = user.pokemons.find(
    (el) => el.name.toLowerCase() === choice!.message!.text.toLowerCase(),
  );

  if (!pokemon || pokemon.timesCaught < EVOLVE_CAP) {
    await ctx.reply(
      "Unsuccessful evolution. Wether you haven't caught that pokemon or you haven't caught it enough times, you can't evolve it now.",
    );
    return;
  }

  const wasBuddy = user.buddyPokemonId === pokemon.id;
  const evolvedPokemon = await conv.external(() =>
    evolvePokemonOperation(pokemon, deps.pokeApi, deps.pokemonDataSource, user.id ?? undefined),
  );

  if (evolvedPokemon.name === pokemon.name) {
    await ctx.reply("Your pokemon can't evolve anymore");
    return;
  }

  if (wasBuddy && evolvedPokemon.id !== pokemon.id) {
    await conv.external(() =>
      deps.userDataSource.updateUser(user, { buddyPokemonId: evolvedPokemon.id }),
    );
  }

  await ctx.reply(`Your ${pokemon.name} evolved to ${evolvedPokemon.name}`);
  return;
}

export async function shinyPokemonConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: Pick<PokemonConversationDeps, "userDataSource" | "pokemonDataSource">,
) {
  const user = await checkUserExists(ctx.from!.id, conv, ctx, deps.userDataSource);
  if (!user) return;

  const pokemonNames = user.pokemons.map((el) => el.name);
  const pokemonPhotos = user.pokemons.map((el) =>
    InputMediaBuilder.photo(getPokemonFrontSprite(el)),
  );

  await sendPokemonPhotos(ctx, pokemonPhotos);
  await ctx.reply(
    `Which pokemon do you want to make shiny? send a message with the name of the pokemon. Your pokemons: ${pokemonNames.join(", ")}`,
  );

  const choice = await conv
    .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
    .andFor(":text")
    .unless((c) => Boolean(c.message?.text?.startsWith("/")), { next: true });
  const pokemon = user.pokemons.find(
    (el) => el.name.toLowerCase() === choice!.message!.text.toLowerCase(),
  );

  if (!pokemon) {
    await ctx.reply("You don't have that pokemon");
    return;
  }

  if (pokemon.isShiny) {
    await ctx.reply(`${pokemon.name} is already shiny.`);
    return;
  }

  if (pokemon.timesCaught < SHINY_CAP) {
    await ctx.reply(`You need at least ${SHINY_CAP} catches to make ${pokemon.name} shiny.`);
    return;
  }

  await conv.external(() => {
    const shinyPokemon = PokemonEntity.fromObject(pokemon).spendForShiny(SHINY_CAP);
    return deps.pokemonDataSource.updatePokemon(pokemon, {
      isShiny: shinyPokemon.isShiny,
      timesCaught: shinyPokemon.timesCaught,
    });
  });

  await ctx.reply(`✨ ${pokemon.name} is now shiny!`);
  return;
}

async function prepareUserTrade(
  userId: number,
  conv: AppConversation,
  ctx: AppContext,
  userDataSource: UserDataSource,
): Promise<[UserEntity, PokemonEntity] | [null, null]> {
  const user = await checkUserExists(userId, conv, ctx, userDataSource);

  if (!user) {
    return [null, null];
  }

  if (user.pokemons.length === 0) {
    await ctx.reply("You don't have any pokemon yet!");
    return [null, null];
  }

  const userPhotos = user.pokemons.map((el) => InputMediaBuilder.photo(getPokemonFrontSprite(el)));
  const userPkmnNames = user.pokemons.map((el) => el.name);

  await sendPokemonPhotos(ctx, userPhotos);
  await ctx.reply(
    `Which pokemon do you want to trade? send a message with the name of the pokemon you want to trade. Your pokemons: ${userPkmnNames.join(", ")}`,
  );

  const userInput = await conv
    .waitFrom(userId, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
    .andFor(":text")
    .unless((c) => Boolean(c.message?.text?.startsWith("/")), { next: true });
  const inputText = userInput.message?.text?.trim().toLowerCase() ?? "";
  const userPkmn = user.pokemons.find((el) => el.name.toLowerCase() === inputText);

  if (!userPkmn) {
    await ctx.reply("You don't have that pokemon");
    return [null, null];
  }

  return [user, userPkmn];
}

async function confirmSelection(
  conv: AppConversation,
  ctx: AppContext,
  user: UserEntity,
  userId: number,
  pokemon: PokemonEntity,
  tradeId: string,
): Promise<boolean> {
  const msg = await ctx.reply(`@${user.username}, would you like to trade your ${pokemon.name}?`, {
    reply_markup: createTradeConfirmKeyboard(tradeId, userId),
  });

  const tradeResult = await conv
    .waitForCallbackQuery(new RegExp(`^trade-(confirm|reject):${tradeId}:${userId}$`), {
      maxMilliseconds: CONVERSATION_TIMEOUT_MS,
    })
    .andFrom(userId);

  await tradeResult.answerCallbackQuery();

  if (tradeResult.callbackQuery.data.startsWith("trade-reject:")) {
    await ctx.reply("Trade cancelled!");
    await ctx.api.deleteMessage(ctx.chat!.id, msg.message_id).catch(() => {});
    return false;
  }

  await ctx.api.deleteMessage(ctx.chat!.id, msg.message_id).catch(() => {});
  return true;
}

export async function tradeConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: Pick<PokemonConversationDeps, "userDataSource" | "pokemonDataSource">,
) {
  if (!isGroupChat(ctx)) {
    await ctx.reply(
      "🔄 Trades need a group chat! Invite a friend and send /trade from a group to trade Pokemon.",
    );
    return;
  }

  const tradeId = await conv.external(() => randomUUID());

  const [userReq, userReqPkmn] = await prepareUserTrade(
    ctx.from!.id,
    conv,
    ctx,
    deps.userDataSource,
  );

  // No valid trade data
  if (!userReq || !userReqPkmn) return;

  const reqMsg = await ctx.reply(
    `@${userReq.username} wants to trade ${userReqPkmn.name}. Click the button below to accept the trade.`,
    {
      reply_markup: createTradeInviteKeyboard(tradeId),
    },
  );

  const userCallback = await conv.waitForCallbackQuery(new RegExp(`^trade-accept:${tradeId}$`), {
    maxMilliseconds: CONVERSATION_TIMEOUT_MS,
  });

  if (BigInt(userCallback.callbackQuery.from.id) === BigInt(userReq.telegramId ?? ctx.from!.id)) {
    await userCallback.answerCallbackQuery({
      text: "You can't trade with yourself!",
      show_alert: true,
    });
    await ctx.api.deleteMessage(ctx.chat!.id, reqMsg.message_id).catch(() => {});
    await ctx.reply("You can't trade with yourself!");
    return;
  }

  await userCallback.answerCallbackQuery();
  await ctx.api.deleteMessage(ctx.chat!.id, reqMsg.message_id).catch(() => {});

  const [userRes, userResPkmn] = await prepareUserTrade(
    userCallback.callbackQuery.from.id,
    conv,
    ctx,
    deps.userDataSource,
  );
  if (!userRes || !userResPkmn) return;

  const trainers = [
    { user: userReq, pokemon: userReqPkmn, trainerId: ctx.from!.id },
    { user: userRes, pokemon: userResPkmn, trainerId: userCallback.callbackQuery.from.id },
  ];

  for (const { user, pokemon, trainerId } of trainers) {
    if (!(await confirmSelection(conv, ctx, user, trainerId, pokemon, tradeId))) {
      return;
    }
  }

  await conv.external(() =>
    deps.pokemonDataSource.tradePokemon(userReq, userReqPkmn, userRes, userResPkmn),
  );

  await ctx.reply("Trade successful!");
}

export async function nicknameConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: Pick<PokemonConversationDeps, "userDataSource" | "pokemonDataSource">,
) {
  const user = await checkUserExists(ctx.from!.id, conv, ctx, deps.userDataSource);
  if (!user) return;

  const pokemonNames = user.pokemons.map((el) => el.name);
  const pokemonPhotos = user.pokemons.map((el) =>
    InputMediaBuilder.photo(getPokemonFrontSprite(el)),
  );

  await sendPokemonPhotos(ctx, pokemonPhotos);
  await ctx.reply(`Which pokemon do you want to give a nickname? (${pokemonNames.join(", ")}):`);

  const choice = await conv
    .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
    .andFor(":text")
    .unless((c) => Boolean(c.message?.text?.startsWith("/")), { next: true });
  const pokemon = user.pokemons.find(
    (el) => el.name.toLowerCase() === choice!.message!.text.toLowerCase(),
  );

  if (!pokemon) {
    await ctx.reply("You don't have that pokemon");
    return;
  }

  await ctx.reply(`Enter the nickname you want to give to ${pokemon.name} (max 20 characters):`);
  const nickname = await conv
    .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
    .andFor(":text")
    .unless((c) => Boolean(c.message?.text?.startsWith("/")), { next: true });

  const newNick = nickname.message?.text?.trim();
  if (!newNick || newNick.length > 20) {
    await ctx.reply("Invalid nickname! It must be between 1 and 20 characters.");
    return;
  }

  await ctx.reply(
    `Are you sure you want to give ${pokemon.name} the nickname "${newNick}"? (yes/no):`,
  );

  const confirm = await conv
    .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
    .andFor(":text")
    .unless((c) => Boolean(c.message?.text?.startsWith("/")), { next: true });
  if (confirm.message?.text?.trim().toLowerCase() !== "yes") {
    await ctx.reply("Nickname not changed!");
    return;
  }

  await conv.external(() =>
    deps.pokemonDataSource.updatePokemon(pokemon, {
      nickname: newNick,
    }),
  );

  await ctx.reply(`Success! ${pokemon.name} is now known as ${newNick}.`);
}
