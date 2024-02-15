import { Bot, CommandContext, Context } from "grammy";
import { PokemonClient } from "pokenode-ts";

export interface RegisteredUser {
  userName: string,
  data: {
    userName: string,
    pokemon: object[]
  }
}

export class User implements RegisteredUser {
  userName: string
  data: {
    userName: string,
    pokemon: object[]
  }
  pokeApi: PokemonClient

  constructor(user: string) {
    this.userName = user

    // creates initial data of a given user
    this.data = {
      userName: this.userName,
      pokemon: [{}]
    }

    this.pokeApi = new PokemonClient()
  }

  get getUserData() {
    return this.data
  }

  get getPokemonSummary() {
    return
  }

  async generatePokemon(pokemon: string, ctx?: CommandContext<Context>) {
    /* try {
      // receives and converts raw data from telegram api to pokeapi
      const request = pokemon.toLowerCase();
      const pokemonFromApi = await pokemonClient.getPokemonByName(request);
      console.log(pokemonFromApi.sprites.front_default);
      return pokemonFromApi.sprites.front_default;
    } catch (err) {
      console.error(err);
      throw new Error(`${err}`);
    } */
  }

  stopGeneratePokemon() {

  }

  generatePokemonNow() {

  }

  catchPokemon() {

  }

  viewPokemon() { }

  tradePokemon() { }
}
