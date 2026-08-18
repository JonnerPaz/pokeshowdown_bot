import { randomUUID } from "node:crypto";
import type { DBService } from "./db.service.js";
import { addConversation } from "./addConversation.decorator.js";
import type { AppContext } from "../data/types.js";
import { Conversation } from "@grammyjs/conversations";
import { Context, InlineKeyboard, InputMediaBuilder } from "grammy";
import { EVOLVE_CAP, SHINY_CAP, CONVERSATION_TIMEOUT_MS } from "../../domain/data/constants.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";

export class PokemonConversation {
  constructor(private readonly dbService: DBService) {}

  @addConversation
  public async pokemons(conv: Conversation, ctx: AppContext) {
    if (ctx.from!.username === null) {
      await ctx.reply("You are not registered!");
      return;
    }

    const user = await conv.external((ctx) =>
      this.dbService.findUserByUsername(ctx.from!.username!),
    );

    if (!user) {
      await ctx.reply("You are not registered!");
      return;
    }

    const pokemonPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );

    await ctx.reply("Your pokemons are:");
    await ctx.api.sendMediaGroup(ctx.chat!.id, pokemonPhotos);
    return;
  }

  @addConversation
  public async generatePokemon(conv: Conversation<AppContext>, ctx: AppContext) {
    const [currentPokemon, keyboard] = await conv.external(() => this.generateWildPokemon());

    const pokemonMedia = InputMediaBuilder.photo(this.getPokemonFrontSprite(currentPokemon));
    const media = await ctx.api.sendMediaGroup(ctx.chat!.id, [pokemonMedia]);

    await ctx.reply(`A wild pokemon has appeared! Touch the buttom to catch it!`, {
      reply_markup: keyboard,
    });

    const choice = await conv
      .waitForCallbackQuery("catch", { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
      .andFrom(ctx.from!);

    const user = await conv.external(() =>
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
    await ctx.api.deleteMessage(choice.chat!.id, choice.callbackQuery.message!.message_id);

    const { pokemons } = user;
    if (pokemons.length >= 6) {
      await ctx.reply(`Your pokemon bag is full! You can't catch ${currentPokemon.name}`);
      return;
    }

    const doesPokemonExist = await this.dbService.findUserPokemonByNameAndVariant(
      user.id,
      currentPokemon.name,
      currentPokemon.isShiny,
    );

    if (doesPokemonExist) {
      await conv.external(() =>
        this.dbService.updatePokemon(doesPokemonExist, {
          timesCaught: doesPokemonExist.timesCaught + 1,
        }),
      );
    } else {
      // pokemon doesn't exist, create it
      await conv.external(() => this.dbService.insertPokemonIntoDB(currentPokemon, user));
    }
    await ctx.reply(
      `@${user.username} has caught ${currentPokemon.isShiny ? "a shiny" : "a"} ${currentPokemon.name}.`,
    );

    return;
  }

  @addConversation
  public async evolvePokemon(conv: Conversation<Context, AppContext>, ctx: AppContext) {
    const user = await this.checkUserExists(ctx.from!.username!, ctx);
    if (!user) return;

    const pokemonNames = user.pokemons.map((el) => el.name);
    const pokemonPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );

    await ctx.api.sendMediaGroup(ctx.chat!.id, pokemonPhotos);
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

    const evolvedPokemon = await this.dbService.evolvePokemon(pokemon);

    if (evolvedPokemon.name === pokemon.name) {
      await ctx.reply("Your pokemon can't evolve anymore");
      return;
    }

    await ctx.reply(`Your ${pokemon.name} evolved to ${evolvedPokemon.name}`);
    return;
  }

  @addConversation
  public async shinyPokemon(conv: Conversation<Context, AppContext>, ctx: AppContext) {
    const user = await this.checkUserExists(ctx.from!.username!, ctx);
    if (!user) return;

    const pokemonNames = user.pokemons.map((el) => el.name);
    const pokemonPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );

    await ctx.api.sendMediaGroup(ctx.chat!.id, pokemonPhotos);
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

    await conv.external(() =>
      this.dbService.updatePokemon(pokemon, {
        isShiny: true,
        timesCaught: pokemon.timesCaught - SHINY_CAP,
      }),
    );

    await ctx.reply(`✨ ${pokemon.name} is now shiny!`);
    return;
  }

  @addConversation
  public async trade(conv: Conversation, ctx: AppContext) {
    const tradeId = randomUUID();

    const [userReq, userReqPkmn] = await this.prepareUserTrade(
      ctx.from!.username!,
      ctx.from!.id,
      conv,
      ctx,
    );
    if (!userReq || !userReqPkmn) return;

    const reqMsg = await ctx.reply(
      `@${userReq.username} wants to trade ${userReqPkmn.name}. Click the button below to accept the trade.`,
      {
        reply_markup: new InlineKeyboard().text("Accept", `trade-accept:${tradeId}`),
      },
    );

    const userCallback = await conv.waitForCallbackQuery(new RegExp(`^trade-accept:${tradeId}$`), {
      maxMilliseconds: CONVERSATION_TIMEOUT_MS,
    });

    if (userCallback.callbackQuery.from.username === userReq.username) {
      await ctx.api.deleteMessage(ctx.chat!.id, reqMsg.message_id);
      await ctx.reply("You can't trade with yourself!");
      return;
    }

    const [userRes, userResPkmn] = await this.prepareUserTrade(
      userCallback.callbackQuery.from.username!,
      userCallback.callbackQuery.from.id!,
      conv,
      ctx,
    );
    if (!userRes || !userResPkmn) return;

    const trainers = {
      1: { user: userReq, pokemon: userReqPkmn },
      2: { user: userRes, pokemon: userResPkmn },
    };

    for (const { user, pokemon } of Object.values(trainers)) {
      const trainerId =
        userReq.username === user.username ? ctx.from!.id : userCallback.callbackQuery.from.id!;

      if (!(await this.confirmSelection(conv, ctx, user, trainerId, pokemon, tradeId))) {
        return;
      }
    }

    await conv.external(() =>
      this.dbService.tradePokemon(userReq, userReqPkmn, userRes, userResPkmn),
    );

    await ctx.reply("Trade successful!");
  }

  @addConversation
  public async nickname(conv: Conversation, ctx: AppContext) {
    const user = await this.checkUserExists(ctx.from!.username!, ctx);
    if (!user) return;

    const pokemonNames = user.pokemons.map((el) => el.name);
    const pokemonPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );

    await ctx.api.sendMediaGroup(ctx.chat!.id, pokemonPhotos);
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

    await ctx.reply(`Enter the nickname you want to give to ${pokemon.name}:`);
    const nickname = await conv
      .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
      .andFor(":text");

    await ctx.reply(
      `Are you sure you want to give ${pokemon.name} the nickname "${nickname.message!.text}"? (yes/no):`,
    );

    const confirm = await conv
      .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
      .andFor(":text");
    if (confirm.message!.text.toLowerCase() !== "yes") {
      await ctx.reply("Nickname not changed!");
      return;
    }

    await conv.external(() =>
      this.dbService.updatePokemon(pokemon, {
        nickname: nickname.message!.text,
      }),
    );

    await ctx.reply(`Success! ${pokemon.name} is now known as ${nickname.message!.text}.`);
  }

  private async prepareUserTrade(
    userName: string,
    userId: number,
    conv: Conversation,
    ctx: AppContext,
  ): Promise<[UserEntity, PokemonEntity] | [null, null]> {
    const user = await conv.external((ctx: AppContext) => this.checkUserExists(userName, ctx));

    if (!user) {
      await ctx.reply("You are not registered!");
      return [null, null];
    }

    const userPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );
    const userPkmnNames = user.pokemons.map((el) => el.name);

    await ctx.api.sendMediaGroup(ctx.chat!.id, userPhotos);
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

  private async confirmSelection(
    conv: Conversation,
    ctx: AppContext,
    user: UserEntity,
    userId: number,
    pokemon: PokemonEntity,
    tradeId: string,
  ): Promise<boolean> {
    const msg = await ctx.reply(
      `@${user.username}, would you like to trade your ${pokemon.name}?`,
      {
        reply_markup: new InlineKeyboard()
          .text("Accept", `trade-accept:${tradeId}`)
          .text("Reject", `trade-reject:${tradeId}`),
      },
    );

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

  private async checkUserExists(userName: string, ctx: AppContext) {
    const user = await this.dbService.findUserByUsername(userName);
    if (!user) {
      await ctx.reply("You are not registered!");
      return null;
    }

    return user;
  }

  private async generateWildPokemon(): Promise<[PokemonEntity, InlineKeyboard]> {
    const pokemon = await this.dbService.createPokemon();
    const keyboard = new InlineKeyboard().text("Catch", "catch");
    return [pokemon, keyboard];
  }

  private getPokemonFrontSprite(pokemon: PokemonEntity): string {
    return pokemon.isShiny ? pokemon.sprites.frontShiny : pokemon.sprites.frontDefault;
  }
}
