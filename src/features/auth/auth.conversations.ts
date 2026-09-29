import type { Conversation } from "@grammyjs/conversations";
import type { AppContext } from "../../presentation/data/types.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import { UserEntity } from "../../domain/entities/users.entity.js";
import { CONVERSATION_TIMEOUT_MS } from "../../domain/data/constants.js";
import { createStarterKeyboard, createDeleteAccountKeyboard } from "./auth.keyboards.js";

export interface AuthConversationDeps {
  userDataSource: UserDataSource;
  pokeApi: PokeApiService;
}

export async function startConversation(_conv: Conversation<AppContext>, ctx: AppContext) {
  const msg =
    "Welcome to PokeBotShowdown. This is a bot for pokemon battle and trade. For more information, type /help";
  return await ctx.reply(msg);
}

export async function registerConversation(
  conv: Conversation<AppContext>,
  ctx: AppContext,
  deps: AuthConversationDeps,
) {
  if (!ctx.from?.username) {
    await ctx.reply(
      "To use this bot, you need to have a Telegram username. Please set one in your Telegram settings and try again.",
    );
    return;
  }

  const user = await conv.external(() => deps.userDataSource.findUserByTelegramId(ctx.from!.id));

  if (user) {
    await ctx.reply("You are already registered!");
    return;
  }

  await ctx.reply("Welcome to ShowdownBot!. Please select your starter!");

  const starters = await conv.external(() => deps.pokeApi.createStarterPokemon());
  const [photos, keyboard] = createStarterKeyboard(starters);

  const media = await ctx.api.sendMediaGroup(ctx.chat!.id, photos);
  const promptMsg = await ctx.reply("Please select one of the following:", {
    reply_markup: keyboard,
  });

  const startedSelected = await conv
    .waitForCallbackQuery(/starter(?:0|1|2|Cancel)/, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
    .andFrom(ctx.from!);

  for (const photo of media) {
    await ctx.api.deleteMessage(ctx.chat!.id, photo.message_id).catch(() => {});
  }
  await ctx.api.deleteMessage(ctx.chat!.id, promptMsg.message_id).catch(() => {});

  const selectedPokemon = keyboard.inline_keyboard.flat().find((_, idx) => {
    const selectedIdx = Number(startedSelected.callbackQuery.data.at(-1));
    return (
      +idx === selectedIdx &&
      selectedIdx >= 0 &&
      selectedIdx <= keyboard.inline_keyboard.flat().length
    );
  });

  if (!selectedPokemon) {
    await ctx.reply("Registration cancelled!");
    return;
  }

  const pokemonName = selectedPokemon.text;
  const starter = await deps.pokeApi.createPokemon(pokemonName);

  const createdUser = await conv.external(() =>
    deps.userDataSource.createUser(
      new UserEntity({
        id: null,
        telegramId: ctx.from!.id,
        username: ctx.from!.username as string,
        createdAt: new Date(),
        updatedAt: new Date(),
        pokemons: [starter],
      }),
    ),
  );

  await ctx.reply(`You're now registered as @${createdUser.username}`);
}

export async function deleteAccountConversation(
  conv: Conversation<AppContext>,
  ctx: AppContext,
  deps: AuthConversationDeps,
) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply("You are not registered!");
    return;
  }

  const isUserRegistered = await conv.external(() =>
    deps.userDataSource.findUserByTelegramId(userId),
  );

  if (!isUserRegistered) {
    await ctx.reply("You are not registered!");
    return;
  }

  const keyboard = createDeleteAccountKeyboard();
  const choice = await ctx.reply("Are you sure you want to delete your account?", {
    reply_markup: keyboard,
  });

  const data = await conv
    .waitForCallbackQuery(/delete-\w+/, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
    .andFrom(ctx.from!);

  if (data.callbackQuery.data === "delete-cancelled") {
    const msg = "Account was not deleted";
    await ctx.api.deleteMessage(choice.chat.id, choice.message_id);
    await ctx.reply(msg);
    return;
  }

  await conv.external(() => deps.userDataSource.deleteUserByTelegramId(userId));

  const msg = "Your account was deleted";
  await ctx.api.deleteMessage(choice.chat.id, choice.message_id);
  return await data.reply(msg);
}
