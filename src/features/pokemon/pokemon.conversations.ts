import { randomUUID } from "node:crypto";
import { InputMediaBuilder } from "grammy";
import type { InputMediaPhoto } from "grammy/types";
import type { AppContext, AppConversation } from "../../presentation/data/types.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import type { RateLimiterService } from "../../presentation/services/rateLimiter.service.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import {
  CONVERSATION_TIMEOUT_MS,
  EVOLVE_CAP,
  MAX_PKMN_PARTY,
  SHINY_CAP,
} from "../../domain/data/constants.js";
import { evolvePokemonOperation, getPokemonFrontSprite } from "./pokemon.service.js";
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
  ctx: AppContext,
  userDataSource: UserDataSource,
): Promise<UserEntity | null> {
  const user = await userDataSource.findUserByTelegramId(userId);
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
  const photoMsg = await ctx.api.sendPhoto(ctx.chat!.id, getPokemonFrontSprite(currentPokemon));
  const promptMsg = await ctx.reply(
    `A wild *${currentPokemon.name}* appeared! Choose a Pokéball to throw (⏳ ${timeoutSec}s):`,
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

    if (!canCatch) {
      await choice.answerCallbackQuery({
        text: "Slow down! Wait a moment before throwing another Pokéball.",
        show_alert: true,
      });
      continue;
    }

    await choice.answerCallbackQuery();

    // Deduct ball from inventory
    const field = getBallUserField(ballType);
    user[field] -= 1;
    await conv.external(() => deps.userDataSource.updateUser(user, { [field]: user[field] }));

    const doesPokemonExist = await conv.external(() =>
      deps.pokemonDataSource.findUserPokemonByNameAndVariant(
        user.id!,
        currentPokemon.name,
        currentPokemon.isShiny,
      ),
    );

    const { pokemons } = user;
    if (!doesPokemonExist && pokemons.length >= MAX_PKMN_PARTY) {
      await ctx.api.deleteMessage(choice.chat!.id, photoMsg.message_id).catch(() => {});
      await ctx.api.deleteMessage(choice.chat!.id, promptMsg.message_id).catch(() => {});
      await ctx.reply(`Your pokemon bag is full! You can't catch ${currentPokemon.name}`);
      return;
    }

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
      } else {
        await conv.external(() => deps.pokemonDataSource.createPokemon(currentPokemon, user));
      }

      await ctx.reply(
        `🎉 Gotcha! @${user.username} caught ${currentPokemon.isShiny ? "a shiny" : "a"} ${currentPokemon.name} using a ${BALL_CONFIGS[ballType].name}!`,
      );
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
      `💥 The wild *${currentPokemon.name}* broke free! It's watching you cautiously.\nChoose another Pokéball to throw (⏳ ${timeoutSec}s):`,
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
  const user = await checkUserExists(ctx.from!.id, ctx, deps.userDataSource);
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
    .andFor(":text");
  const pokemon = user.pokemons.find(
    (el) => el.name.toLowerCase() === choice!.message!.text.toLowerCase(),
  );

  if (!pokemon || pokemon.timesCaught < EVOLVE_CAP) {
    await ctx.reply(
      "Unsuccessful evolution. Wether you haven't caught that pokemon or you haven't caught it enough times, you can't evolve it now.",
    );
    return;
  }

  const evolvedPokemon = await evolvePokemonOperation(
    pokemon,
    deps.pokeApi,
    deps.pokemonDataSource,
  );

  if (evolvedPokemon.name === pokemon.name) {
    await ctx.reply("Your pokemon can't evolve anymore");
    return;
  }

  await ctx.reply(`Your ${pokemon.name} evolved to ${evolvedPokemon.name}`);
  return;
}

export async function shinyPokemonConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: Pick<PokemonConversationDeps, "userDataSource" | "pokemonDataSource">,
) {
  const user = await checkUserExists(ctx.from!.id, ctx, deps.userDataSource);
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
    .andFor(":text");
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
    const shinyPokemon = pokemon.spendForShiny(SHINY_CAP);
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
  const user = await conv.external(() => checkUserExists(userId, ctx, userDataSource));

  if (!user) {
    await ctx.reply("You are not registered!");
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
    .andFor(":text");
  const userPkmn = user.pokemons.find(
    (el) => el.name.toLowerCase() === userInput!.message!.text.toLowerCase(),
  );

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
    reply_markup: createTradeConfirmKeyboard(tradeId),
  });

  const tradeResult = await conv
    .waitForCallbackQuery(new RegExp(`^trade-(accept|reject):${tradeId}$`), {
      maxMilliseconds: CONVERSATION_TIMEOUT_MS,
    })
    .andFrom(userId);

  if (tradeResult.callbackQuery.data === `trade-reject:${tradeId}`) {
    await ctx.reply("Trade cancelled!");
    await ctx.api.deleteMessage(ctx.chat!.id, msg.message_id);
    return false;
  }

  await ctx.api.deleteMessage(ctx.chat!.id, msg.message_id);
  return true;
}

export async function tradeConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: Pick<PokemonConversationDeps, "userDataSource" | "pokemonDataSource">,
) {
  const tradeId = randomUUID();

  const [userReq, userReqPkmn] = await prepareUserTrade(
    ctx.from!.id,
    conv,
    ctx,
    deps.userDataSource,
  );
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

  if (userCallback.callbackQuery.from.id === userReq.telegramId) {
    await ctx.api.deleteMessage(ctx.chat!.id, reqMsg.message_id);
    await ctx.reply("You can't trade with yourself!");
    return;
  }

  const [userRes, userResPkmn] = await prepareUserTrade(
    userCallback.callbackQuery.from.id,
    conv,
    ctx,
    deps.userDataSource,
  );
  if (!userRes || !userResPkmn) return;

  const trainers = {
    1: { user: userReq, pokemon: userReqPkmn },
    2: { user: userRes, pokemon: userResPkmn },
  };

  for (const { user, pokemon } of Object.values(trainers)) {
    const trainerId =
      userReq.telegramId === user.telegramId ? ctx.from!.id : userCallback.callbackQuery.from.id;

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
  const user = await checkUserExists(ctx.from!.id, ctx, deps.userDataSource);
  if (!user) return;

  const pokemonNames = user.pokemons.map((el) => el.name);
  const pokemonPhotos = user.pokemons.map((el) =>
    InputMediaBuilder.photo(getPokemonFrontSprite(el)),
  );

  await sendPokemonPhotos(ctx, pokemonPhotos);
  await ctx.reply(`Which pokemon do you want to give a nickname? (${pokemonNames.join(", ")}):`);

  const choice = await conv
    .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
    .andFor(":text");
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
    .andFor(":text");

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
    .andFor(":text");
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
