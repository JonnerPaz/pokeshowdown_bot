import type { AppContext, AppConversation } from "../data/types.js";
import { addConversation } from "./addConversation.decorator.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { PokeApiService } from "./pokeapi.service.js";
import type { RateLimiterService } from "./rateLimiter.service.js";
import {
  pokemonsConversation,
  generatePokemonConversation,
  evolvePokemonConversation,
  shinyPokemonConversation,
  tradeConversation,
  nicknameConversation,
} from "../../features/pokemon/pokemon.conversations.js";

export class PokemonConversation {
  constructor(
    private readonly userDataSource: UserDataSource,
    private readonly pokemonDataSource: PokemonDataSource,
    private readonly pokeApi: PokeApiService,
    private readonly rateLimiter: RateLimiterService,
  ) {}

  @addConversation
  public async pokemons(conv: AppConversation, ctx: AppContext) {
    return pokemonsConversation(conv, ctx, { userDataSource: this.userDataSource });
  }

  @addConversation
  public async generatePokemon(conv: AppConversation, ctx: AppContext) {
    return generatePokemonConversation(conv, ctx, {
      userDataSource: this.userDataSource,
      pokemonDataSource: this.pokemonDataSource,
      pokeApi: this.pokeApi,
      rateLimiter: this.rateLimiter,
    });
  }

  @addConversation
  public async evolvePokemon(conv: AppConversation, ctx: AppContext) {
    return evolvePokemonConversation(conv, ctx, {
      userDataSource: this.userDataSource,
      pokemonDataSource: this.pokemonDataSource,
      pokeApi: this.pokeApi,
    });
  }

  @addConversation
  public async shinyPokemon(conv: AppConversation, ctx: AppContext) {
    return shinyPokemonConversation(conv, ctx, {
      userDataSource: this.userDataSource,
      pokemonDataSource: this.pokemonDataSource,
    });
  }

  @addConversation
  public async trade(conv: AppConversation, ctx: AppContext) {
    return tradeConversation(conv, ctx, {
      userDataSource: this.userDataSource,
      pokemonDataSource: this.pokemonDataSource,
    });
  }

  @addConversation
  public async nickname(conv: AppConversation, ctx: AppContext) {
    return nicknameConversation(conv, ctx, {
      userDataSource: this.userDataSource,
      pokemonDataSource: this.pokemonDataSource,
    });
  }
}
