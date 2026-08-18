import type { InputMediaPhoto } from "grammy/types";
import type { AppContext } from "../data/types.js";
import { addConversation } from "./addConversation.decorator.js";
import { DBService } from "./db.service.js";
import { Conversation } from "@grammyjs/conversations";
import { InlineKeyboard, InputMediaBuilder } from "grammy";
import { UserEntity } from "../../domain/entities/users.entity.js";
import { CONVERSATION_TIMEOUT_MS } from "../../domain/data/constants.js";

export class AuthConversation {
  constructor(private readonly dbService: DBService) {}

  @addConversation
  public async start(conv: Conversation<AppContext>, ctx: AppContext) {
    const msg =
      "Welcome to PokeBotShowdown. This is a bot for pokemon battle and trade. For more information, type /help";
    return await ctx.reply(msg);
  }

  @addConversation
  public async register(conv: Conversation, ctx: AppContext) {
    if (ctx.from!.username === null) {
      await ctx.reply(
        "To use this bot, you need to have a username. Once you have one, please try again.",
      );
      return;
    }

    const user = await conv.external((ctx) =>
      this.dbService.findUserByUsername(ctx.from!.username!),
    );

    if (user) {
      await ctx.reply("You are already registered!");
      return;
    }

    await ctx.reply("Welcome to ShowdownBot!. Please select your starter!");

    const [photos, keyboard] = await conv.external(() => this.getStarterKeyboard());

    await ctx.api.sendMediaGroup(ctx.chat!.id, photos);
    await ctx.reply("Please select one of the following:", {
      reply_markup: keyboard,
    });

    const startedSelected = await conv
      .waitForCallbackQuery(/starter(?:0|1|2|Cancel)/, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
      .andFrom(ctx.from!);

    const selectedPokemon = keyboard.inline_keyboard.flat().find((_, idx) => {
      const selectedIdx = Number(startedSelected.callbackQuery.data.at(-1));
      return (
        +idx === selectedIdx &&
        selectedIdx >= 0 &&
        selectedIdx <= keyboard.inline_keyboard.flat().length
      );
    });

    await startedSelected.deleteMessage();

    if (!selectedPokemon) {
      await ctx.reply("Registration cancelled!");
      return;
    }

    const pokemonName = selectedPokemon.text;

    const starter = await this.dbService.createPokemon(pokemonName);

    const createdUser = await conv.external(() =>
      this.dbService.createUser(
        new UserEntity({
          id: null,
          username: ctx.from!.username as string,
          createdAt: new Date(),
          updatedAt: new Date(),
          pokemons: [starter],
        }),
      ),
    );

    await ctx.reply(`You're now registered as @${createdUser.username}`);
  }

  private async getStarterKeyboard(): Promise<[InputMediaPhoto[], InlineKeyboard]> {
    // create starters
    const pokemons = await this.dbService.createStarterPokemon();
    const photos = pokemons.map((el) => InputMediaBuilder.photo(el.sprites.frontDefault));

    const keyboard = new InlineKeyboard()
      .text(pokemons[0].name, "starter0")
      .text(pokemons[1].name, "starter1")
      .text(pokemons[2].name, "starter2")
      .text("Cancel", "starterCancel");

    return [photos, keyboard];
  }

  @addConversation
  public async deleteAccount(conv: Conversation<AppContext>, ctx: AppContext) {
    const username = ctx.from?.username;
    if (!username) {
      await ctx.reply("You are not registered!");
      return;
    }

    const isUserRegistered = await conv.external(() => this.dbService.findUserByUsername(username));

    if (!isUserRegistered) {
      await ctx.reply("You are not registered!");
      return;
    }

    const keyboard = new InlineKeyboard()
      .text("Yes", "delete-account")
      .text("No", "delete-cancelled");

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

    await conv.external(() => this.dbService.deleteUserByUsername(username));

    const msg = "Your account was deleted";
    await ctx.api.deleteMessage(choice.chat.id, choice.message_id);
    return await data.reply(msg);
  }
}
