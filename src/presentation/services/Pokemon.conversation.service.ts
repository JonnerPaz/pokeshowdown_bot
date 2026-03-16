import type { DBService } from "./db.service.js";
import { addConversation } from "./addConversation.decorator.js";
import type { AppContext } from "../data/types.js";
import { Conversation } from "@grammyjs/conversations";
import { Context, InlineKeyboard, InputMediaBuilder } from "grammy";
import type { InputMediaPhoto } from "grammy/types";
import { EVOLVE_CAP } from "../../domain/data/constants.js";

export class PokemonConversation {
  constructor(private readonly dbService: DBService) {}

  @addConversation
  public async pokemons(conv: Conversation, ctx: AppContext) {
    try {
      const user = await conv.external((ctx) =>
        this.dbService.findUserByUsername(ctx.from!.username!),
      );

      if (!user) {
        await ctx.reply("You are not registered!");
        return;
      }

      const pokemonPhotos = user.pokemons.map((el) =>
        InputMediaBuilder.photo(el.sprites.frontDefault),
      );

      await ctx.reply("Your pokemons are:");
      await ctx.api.sendMediaGroup(ctx.chat!.id, pokemonPhotos);
      return;
    } catch (err) {
      ctx.reply("There was an error during request. Please report it");
      throw err;
    }
  }

  @addConversation
  public async generatePokemon(
    conv: Conversation<AppContext>,
    ctx: AppContext,
  ) {
    try {
      const [pokemonPhoto, keyboard] = await conv.external(() =>
        this.generateWildPokemon(ctx.from!.id),
      );

      const media = await ctx.api.sendMediaGroup(ctx.chat!.id, [pokemonPhoto]);

      await ctx.reply(
        "A wild pokemon has appeared! Touch the buttom to catch it!",
        { reply_markup: keyboard },
      );

      const choice = await conv
        .waitForCallbackQuery("catch")
        .andFrom(ctx.from!);

      const user = await conv.external((_) =>
        this.dbService.findUserByUsername(choice.callbackQuery.from.username!),
      );
      if (!user || !user.id) {
        await ctx.reply("You are not registered!");
        return;
      }

      // delete message and photos
      for (const photo of media) {
        await ctx.api.deleteMessage(choice.chat!.id, photo.message_id);
      }
      await ctx.api.deleteMessage(
        choice.chat!.id,
        choice.callbackQuery.message!.message_id,
      );

      const currentPokemon = this.dbService.getCurrentEncounter(ctx.from!.id);

      const { pokemons } = user;
      if (pokemons.length >= 6) {
        await ctx.reply(
          `Your pokemon bag is full! You can't catch ${currentPokemon?.name}`,
        );
        return;
      }

      if (!currentPokemon) {
        await ctx.reply("There was an error during request. Please report it");
        throw new Error("NO CURRENT POKEMON");
      }

      const doesPokemonExist = await this.dbService.findPokemonByName(
        currentPokemon.name,
      );

      doesPokemonExist
        ? await conv.external(() =>
            this.dbService.updatePokemon(doesPokemonExist, {
              timesCaught: doesPokemonExist.timesCaught + 1,
            }),
          )
        : // pokemon doesn't exist, create it
          await conv.external(() =>
            this.dbService.insertPokemonIntoDB(
              currentPokemon!,
              user,
            ),
          );
      await ctx.reply(
        `@${user.username} has caught a ${currentPokemon.name}.`,
      );

      this.dbService.setCurrentEncounter(ctx.from!.id, null);
      return;
    } catch (err) {
      await ctx.reply("There was an error during request. Please report it");
      throw err;
    }
  }

  @addConversation
  public async evolvePokemon(
    conv: Conversation<Context, AppContext>,
    ctx: AppContext,
  ) {
    try {
      const user = await this.checkUser(ctx.from!.username!, ctx);
      if (!user) return;

      const pokemonNames = user.pokemons.map((el) => el.name);
      const pokemonPhotos = user.pokemons.map((el) =>
        InputMediaBuilder.photo(el.sprites.frontDefault),
      );

      await ctx.api.sendMediaGroup(ctx.chat!.id, pokemonPhotos);
      await ctx.reply(
        `Which pokemon do you want to evolve? send a message with the name of the pokemon you want to evolve. Your pokemons: ${pokemonNames.join(", ")}`,
      );

      const choice = await conv.waitFrom(ctx.from!.id).andFor(":text");
      const pokemon = user.pokemons.find(
        (el) => el.name.toLowerCase() === choice!.message!.text.toLowerCase(),
      );

      if (!pokemon || pokemon.timesCaught < EVOLVE_CAP) {
        await ctx.reply(
          "Unsuccessful evolution. Wether you haven't caught that pokemon or you haven't caught it enough times, you can't evolve it now.",
        );
        return;
      }

      const evolvedPokemon = await this.dbService.evolvePokemon(pokemon);

      if (evolvedPokemon.name === pokemon.name) {
        await ctx.reply("Your pokemon can't evolve anymore");
        return;
      }

      await ctx.reply(`Your ${pokemon.name} evolved to ${evolvedPokemon.name}`);
      return;
    } catch (err) {
      await ctx.reply("There was an error during request. Please report it");
      throw err;
    }
  }

  @addConversation
  public async trade(conv: Conversation, ctx: AppContext) {
    try {
      const userRequest = await conv.external((ctx) =>
        this.dbService.findUserByUsername(ctx.from!.username!),
      );

      if (!userRequest) {
        await ctx.reply("You are not registered!");
        return;
      }

      const userRequestpokemonPhotos = userRequest.pokemons.map((el) =>
        InputMediaBuilder.photo(el.sprites.frontDefault),
      );
      const userRequestpokemonNames = userRequest.pokemons.map((el) => el.name);

      await ctx.api.sendMediaGroup(ctx.chat!.id, userRequestpokemonPhotos);
      await ctx.reply(
        `Which pokemon do you want to trade? send a message with the name of the pokemon you want to trade. Your pokemons: ${userRequestpokemonNames.join(", ")}`,
      );

      const choice = await conv.waitFrom(ctx.from!.id).andFor(":text");

      const userRequestpokemon = userRequest.pokemons.find(
        (el) => el.name.toLowerCase() === choice?.message?.text.toLowerCase(),
      );

      if (!userRequestpokemon) {
        await ctx.reply("You don't have that pokemon. Please try again");
        return;
      }

      await ctx.reply(
        `@${userRequest.username} wants to trade ${userRequestpokemon.name}. Click the button below to accept the trade.`,
        {
          reply_markup: new InlineKeyboard().text("Accept", "trade-accept"),
        },
      );

      const userCallback = await conv.waitForCallbackQuery(/trade-accept/, {
        otherwise(ctx) {
          ctx.api.deleteMessage(
            ctx.chat!.id,
            ctx.callbackQuery!.message!.message_id,
          );
        },
      });

      const userResponse = await conv.external((_) =>
        this.dbService.findUserByUsername(
          userCallback.callbackQuery.from.username!,
        ),
      );

      if (!userResponse) {
        await ctx.reply("You are not registered!");
        return;
      }

      const userResponsePokemonPhotos = userResponse.pokemons.map((el) =>
        InputMediaBuilder.photo(el.sprites.frontDefault),
      );
      const userResponsePokemonNames = userResponse.pokemons.map(
        (el) => el.name,
      );

      await ctx.api.sendMediaGroup(ctx.chat!.id, userResponsePokemonPhotos);
      await ctx.reply(
        `@${userResponse.username}, select the pokemon you want to trade. Your pokemons: ${userResponsePokemonNames.join(", ")}`,
        {
          reply_markup: new InlineKeyboard().text("Accept", "trade-accept"),
        },
      );

      const userResponseChoice = await conv
        .waitForCallbackQuery(/trade-accept/)
        .andFrom(userCallback.callbackQuery.from);

      const userResponsepokemon = userResponse.pokemons.find(
        (el) =>
          el.name.toLowerCase() ===
          userResponseChoice.callbackQuery.data.toLowerCase(),
      );

      if (!userResponsepokemon) {
        await ctx.reply(
          "You don't have that pokemon. Please try again. Trade cancelled!",
        );
        return;
      }

      await ctx.reply(
        `@${userResponse.username}, would you like to trade ${userRequestpokemon.name}?`,
        {
          reply_markup: new InlineKeyboard()
            .text("Accept", "trade-accept")
            .text("Reject", "trade-reject"),
        },
      );

      const tradeResult = await conv
        .waitForCallbackQuery(/trade-accept|trade-reject/)
        .andFrom(userCallback.callbackQuery.from);

      if (tradeResult.callbackQuery.data === "trade-reject") {
        await ctx.reply("Trade cancelled!");
        return;
      }

      await ctx.reply(
        `@${userRequest.username}, would you like to trade ${userRequestpokemon.name}?`,
        {
          reply_markup: new InlineKeyboard()
            .text("Accept", "trade-accept")
            .text("Reject", "trade-reject"),
        },
      );
      const userRequestChoice = await conv
        .waitForCallbackQuery(/trade-accept|trade-reject/)
        .andFrom(ctx.from!);

      if (userRequestChoice.callbackQuery.data === "trade-reject") {
        await ctx.reply("Trade cancelled!");
        return;
      }

      await ctx.reply("Trade successful!");
    } catch (err) {
      await ctx.reply("There was an error during request. Please report it");
      throw err;
    }
  }

  private async checkUser(userName: string, ctx: AppContext) {
    const user = await this.dbService.findUserByUsername(userName);
    if (!user) {
      await ctx.reply("You are not registered!");
      return null;
    }
    return user;
  }

  private async generateWildPokemon(
    userId: number,
  ): Promise<[InputMediaPhoto, InlineKeyboard]> {
    const pokemon = await this.dbService.createPokemon(userId);
    const keyboard = new InlineKeyboard().text("Catch", "catch");
    return [InputMediaBuilder.photo(pokemon.sprites.frontDefault), keyboard];
  }
}
