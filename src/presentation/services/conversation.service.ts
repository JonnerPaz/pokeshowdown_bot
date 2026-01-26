import { InlineKeyboard, InputMediaBuilder } from "grammy";
import { Conversation } from "@grammyjs/conversations";
import type { AppContext } from "../data/types.js";
import type { InputMediaPhoto } from "grammy/types";
import { EVOLVE_CAP } from "../../domain/data/constants.js";
import type { Context } from "grammy";
import { addConversation } from "./addConversation.decorator.js";
import { CreateUserDto } from "../../domain/dto/user/create-user.dto.js";
import type { DBService } from "./db.service.js";
import { UpdatePokemonDto } from "../../domain/dto/pokemon/update-pokemon.dto.js";
import { UpdateUserDto } from "../../domain/dto/user/update-user.dto.js";

export class ConversationService<T extends AppContext> {
  public botConversations = new Map<string, Conversation<AppContext>>();

  constructor(private readonly dbService: DBService) {}

  @addConversation
  public async start(conv: Conversation<T>, ctx: AppContext) {
    const msg =
      "Welcome to PokeBotShowdown. This is a bot for pokemon battle and trade. For more information, type /help";
    return await ctx.reply(msg);
  }

  @addConversation
  public async register(conv: Conversation, ctx: AppContext) {
    try {
      const user = await conv.external((ctx) =>
        this.dbService.findUserByUsername(ctx.from!.username!),
      );

      if (user) {
        await ctx.reply("You are already registered!");
        return;
      }

      await ctx.reply("Welcome to ShowdownBot!. Please select your starter!");

      const [photos, keyboard] = await conv.external(() =>
        this.getStarterKeyboard(),
      );

      await ctx.api.sendMediaGroup(ctx.chat!.id, photos);
      await ctx.reply("Please select one of the following:", {
        reply_markup: keyboard,
      });

      const startedSelected = await conv
        .waitForCallbackQuery(/starter(?:0|1|2|Cancel)/)
        .andFrom(ctx.from!);

      let pokemonName: string | null;

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

      pokemonName = selectedPokemon.text;

      const starter = await this.dbService.createPokemon(pokemonName);

      const createdUser = await conv.external(() =>
        this.dbService.createUser(
          CreateUserDto.fromObject({
            username: ctx.from!.username as string,
            createdAt: new Date(),
            updatedAt: new Date(),
            pokemons: [starter],
          }),
        ),
      );

      await ctx.reply(`You're now registered as @${createdUser.username}`);
    } catch (error) {
      ctx.reply("There was an error during request. Please report it");
      throw error;
    }
  }

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
  public async deleteAccount(conv: Conversation<T>, ctx: AppContext) {
    try {
      const username = ctx.from?.username as string;
      const isUserRegistered =
        await this.dbService.findUserByUsername(username);

      if (!isUserRegistered) {
        await ctx.reply("You are not registered!");
        return;
      }

      const keyboard = new InlineKeyboard()
        .text("Yes", "delete-account")
        .text("No", "delete-cancelled");

      const choice = await ctx.reply(
        "Are you sure you want to delete your account?",
        { reply_markup: keyboard },
      );

      const data = await conv
        .waitForCallbackQuery(/delete-\w+/)
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
    } catch (err) {
      await ctx.reply("There was an error during request. Please report it");
      throw err;
    }
  }

  @addConversation
  public async generatePokemon(conv: Conversation<T>, ctx: AppContext) {
    try {
      const [pokemonPhoto, keyboard] = await conv.external(() =>
        this.generateWildPokemon(),
      );

      await ctx.api.sendMediaGroup(ctx.chat!.id, [pokemonPhoto]);
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

      await ctx.api.deleteMessage(
        choice.chat!.id,
        choice.callbackQuery.message!.message_id,
      );

      const { pokemons } = user;
      if (pokemons.length === 6) {
        await ctx.reply(
          `Your pokemon bag is full! You can't catch ${this.dbService.getCurrentPokemon?.name}`,
        );
        return;
      }

      if (!this.dbService.getCurrentPokemon) {
        await ctx.reply("There was an error during request. Please report it");
        throw new Error("NO CURRENT POKEMON");
      }

      const doesPokemonExist = await this.dbService.findPokemonByName(
        this.dbService.getCurrentPokemon.name,
      );

      doesPokemonExist
        ? await conv.external(() =>
            this.dbService.updatePokemon(this.dbService.getCurrentPokemon!, {
              timesCaught: this.dbService.getCurrentPokemon!.timesCaught + 1,
            }),
          )
        : // pokemon doesn't exist, create it
          await conv.external(() =>
            this.dbService.insertPokemonIntoDB(
              this.dbService.getCurrentPokemon!,
              user,
            ),
          );
      await ctx.reply(
        `@${user.username} has caught a ${this.dbService.getCurrentPokemon.name}.`,
      );

      this.dbService.setCurrentPokemon = null;
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
      if (!ctx.from?.username) {
        await ctx.reply("Error: User not found");
        return;
      }

      const user = await conv.external((ctx) =>
        this.dbService.findUserByUsername(ctx.from!.username as string),
      );

      if (!user) {
        await ctx.reply("You are not registered!");
        return;
      }

      const pokemonNames = user.pokemons.map((el) => el.name);
      const pokemonPhotos = user.pokemons.map((el) =>
        InputMediaBuilder.photo(el.sprites.frontDefault),
      );

      await ctx.api.sendMediaGroup(ctx.chat!.id, pokemonPhotos);
      await ctx.reply(
        `Which pokemon do you want to evolve? send a message with the name of the pokemon you want to evolve. Your pokemons: ${pokemonNames.join(", ")}`,
      );

      const choice = await conv.waitFrom(ctx.from.id).andFor(":text");

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

  private async getStarterKeyboard(): Promise<
    [InputMediaPhoto[], InlineKeyboard]
  > {
    // create starters
    const pokemons = await this.dbService.createStarterPokemon();
    const photos = pokemons.map((el) =>
      InputMediaBuilder.photo(el.sprites.frontDefault),
    );

    const keyboard = new InlineKeyboard()
      .text(pokemons[0].name, "starter0")
      .text(pokemons[1].name, "starter1")
      .text(pokemons[2].name, "starter2")
      .text("Cancel", "starterCancel");

    return [photos, keyboard];
  }

  private async generateWildPokemon(): Promise<
    [InputMediaPhoto, InlineKeyboard]
  > {
    const pokemon = await this.dbService.createPokemon();
    const keyboard = new InlineKeyboard().text("Catch", "catch");
    return [InputMediaBuilder.photo(pokemon.sprites.frontDefault), keyboard];
  }
}
