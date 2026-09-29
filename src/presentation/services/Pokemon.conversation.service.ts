import { randomUUID } from "node:crypto";
import type { InputMediaPhoto } from "grammy/types";
import { addConversation } from "./addConversation.decorator.js";
import type { AppContext } from "../data/types.js";
import { Conversation } from "@grammyjs/conversations";
import { Context, InlineKeyboard, InputMediaBuilder } from "grammy";
import {
  CONVERSATION_TIMEOUT_MS,
  EVOLVE_CAP,
  MAX_PKMN_PARTY,
  SHINY_CAP,
} from "../../domain/data/constants.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { RateLimiterService } from "./rateLimiter.service.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { PokeApiService } from "./pokeapi.service.js";
import { evolvePokemonOperation } from "../../features/pokemon/pokemon.service.js";

export class PokemonConversation {
  constructor(
    private readonly userDataSource: UserDataSource,
    private readonly pokemonDataSource: PokemonDataSource,
    private readonly pokeApi: PokeApiService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  @addConversation
  public async pokemons(conv: Conversation, ctx: AppContext) {
    const user = await conv.external(() => this.userDataSource.findUserByTelegramId(ctx.from!.id));

    if (!user) {
      await ctx.reply("You are not registered!");
      return;
    }

    if (user.pokemons.length === 0) {
      await ctx.reply("You don't have any pokemon yet!");
      return;
    }

    const pokemonPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );

    await ctx.reply("Your pokemons are:");
    await this.sendPokemonPhotos(ctx, pokemonPhotos);
    return;
  }

  @addConversation
  public async generatePokemon(conv: Conversation<AppContext>, ctx: AppContext) {
    const userId = ctx.from!.id;
    const canSpawn = await conv.external(() => {
      if (!this.rateLimiter.isAllowed(userId, "spawn")) return false;
      this.rateLimiter.hit(userId, "spawn");
      return true;
    });

    if (!canSpawn) {
      await ctx.reply("Slow down! You're spawning too many pokemon.");
      return;
    }

    const [currentPokemon, keyboard] = await conv.external(() => this.generateWildPokemon());

    const photoMsg = await ctx.api.sendPhoto(
      ctx.chat!.id,
      this.getPokemonFrontSprite(currentPokemon),
    );

    const promptMsg = await ctx.reply(
      `A wild pokemon has appeared! Touch the button to catch it!`,
      {
        reply_markup: keyboard,
      },
    );

    const choice = await conv
      .waitForCallbackQuery("catch", { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
      .andFrom(ctx.from!);

    const user = await conv.external(() =>
      this.userDataSource.findUserByTelegramId(choice.callbackQuery.from.id),
    );
    if (!user || !user.id) {
      await ctx.reply("You are not registered!");
      return;
    }

    // delete prompt and photo
    await ctx.api.deleteMessage(choice.chat!.id, photoMsg.message_id).catch(() => {});
    await ctx.api.deleteMessage(choice.chat!.id, promptMsg.message_id).catch(() => {});

    const doesPokemonExist = await this.pokemonDataSource.findUserPokemonByNameAndVariant(
      user.id,
      currentPokemon.name,
      currentPokemon.isShiny,
    );

    const { pokemons } = user;
    if (!doesPokemonExist && pokemons.length >= MAX_PKMN_PARTY) {
      await ctx.reply(`Your pokemon bag is full! You can't catch ${currentPokemon.name}`);
      return;
    }

    const canCatch = await conv.external(() => {
      if (!this.rateLimiter.isAllowed(userId, "catch")) return false;
      this.rateLimiter.hit(userId, "catch");
      return true;
    });

    if (!canCatch) {
      await ctx.reply("Slow down! You're catching too many pokemon.");
      return;
    }

    if (doesPokemonExist) {
      await conv.external(() =>
        this.pokemonDataSource.updatePokemon(doesPokemonExist, {
          timesCaught: doesPokemonExist.timesCaught + 1,
        }),
      );
    } else {
      // pokemon doesn't exist, create it
      await conv.external(() => this.pokemonDataSource.createPokemon(currentPokemon, user));
    }
    this.rateLimiter.hit(userId, "catch");
    await ctx.reply(
      `@${user.username} has caught ${currentPokemon.isShiny ? "a shiny" : "a"} ${currentPokemon.name}.`,
    );

    return;
  }

  @addConversation
  public async evolvePokemon(conv: Conversation<Context, AppContext>, ctx: AppContext) {
    const user = await this.checkUserExists(ctx.from!.id, ctx);
    if (!user) return;

    const pokemonNames = user.pokemons.map((el) => el.name);
    const pokemonPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );

    await this.sendPokemonPhotos(ctx, pokemonPhotos);
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
      this.pokeApi,
      this.pokemonDataSource,
    );

    if (evolvedPokemon.name === pokemon.name) {
      await ctx.reply("Your pokemon can't evolve anymore");
      return;
    }

    await ctx.reply(`Your ${pokemon.name} evolved to ${evolvedPokemon.name}`);
    return;
  }

  @addConversation
  public async shinyPokemon(conv: Conversation<Context, AppContext>, ctx: AppContext) {
    const user = await this.checkUserExists(ctx.from!.id, ctx);
    if (!user) return;

    const pokemonNames = user.pokemons.map((el) => el.name);
    const pokemonPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );

    await this.sendPokemonPhotos(ctx, pokemonPhotos);
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
      return this.pokemonDataSource.updatePokemon(pokemon, {
        isShiny: shinyPokemon.isShiny,
        timesCaught: shinyPokemon.timesCaught,
      });
    });

    await ctx.reply(`✨ ${pokemon.name} is now shiny!`);
    return;
  }

  @addConversation
  public async trade(conv: Conversation, ctx: AppContext) {
    const tradeId = randomUUID();

    const [userReq, userReqPkmn] = await this.prepareUserTrade(ctx.from!.id, conv, ctx);
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

    if (userCallback.callbackQuery.from.id === userReq.telegramId) {
      await ctx.api.deleteMessage(ctx.chat!.id, reqMsg.message_id);
      await ctx.reply("You can't trade with yourself!");
      return;
    }

    const [userRes, userResPkmn] = await this.prepareUserTrade(
      userCallback.callbackQuery.from.id,
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
        userReq.telegramId === user.telegramId ? ctx.from!.id : userCallback.callbackQuery.from.id;

      if (!(await this.confirmSelection(conv, ctx, user, trainerId, pokemon, tradeId))) {
        return;
      }
    }

    await conv.external(() =>
      this.pokemonDataSource.tradePokemon(userReq, userReqPkmn, userRes, userResPkmn),
    );

    await ctx.reply("Trade successful!");
  }

  @addConversation
  public async nickname(conv: Conversation, ctx: AppContext) {
    const user = await this.checkUserExists(ctx.from!.id, ctx);
    if (!user) return;

    const pokemonNames = user.pokemons.map((el) => el.name);
    const pokemonPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );

    await this.sendPokemonPhotos(ctx, pokemonPhotos);
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
      this.pokemonDataSource.updatePokemon(pokemon, {
        nickname: newNick,
      }),
    );

    await ctx.reply(`Success! ${pokemon.name} is now known as ${newNick}.`);
  }

  private async prepareUserTrade(
    userId: number,
    conv: Conversation,
    ctx: AppContext,
  ): Promise<[UserEntity, PokemonEntity] | [null, null]> {
    const user = await conv.external((ctx: AppContext) => this.checkUserExists(userId, ctx));

    if (!user) {
      await ctx.reply("You are not registered!");
      return [null, null];
    }

    const userPhotos = user.pokemons.map((el) =>
      InputMediaBuilder.photo(this.getPokemonFrontSprite(el)),
    );
    const userPkmnNames = user.pokemons.map((el) => el.name);

    await this.sendPokemonPhotos(ctx, userPhotos);
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

  private async checkUserExists(userId: number, ctx: AppContext) {
    const user = await this.userDataSource.findUserByTelegramId(userId);
    if (!user) {
      await ctx.reply("You are not registered!");
      return null;
    }

    return user;
  }

  private async generateWildPokemon(): Promise<[PokemonEntity, InlineKeyboard]> {
    const pokemon = await this.pokeApi.createPokemon();
    const keyboard = new InlineKeyboard().text("Catch", "catch");
    return [pokemon, keyboard];
  }

  private getPokemonFrontSprite(pokemon: PokemonEntity): string {
    return pokemon.isShiny ? pokemon.sprites.frontShiny : pokemon.sprites.frontDefault;
  }

  private async sendPokemonPhotos(
    ctx: AppContext,
    photos: InputMediaPhoto[],
  ): Promise<Array<{ message_id: number }>> {
    if (photos.length === 0) return [];
    const single = photos[0];
    if (photos.length === 1 && single) {
      const sent = await ctx.api.sendPhoto(ctx.chat!.id, single.media);
      return [sent];
    }
    return await ctx.api.sendMediaGroup(ctx.chat!.id, photos);
  }
}
