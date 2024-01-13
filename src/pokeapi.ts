import { PokemonClient } from "pokenode-ts";

// const pokeapi = "https://pokeapi.co/api/v2/pokemon";

// Every request will return a promise
const pokemonClient = new PokemonClient();

class Pokemon {
	async pokeRenderer(pokemon: string): Promise<any> {
		try {
			// receives and converts raw data from telegram api to pokeapi
			const request = pokemon.toLowerCase();
			const pokemonFromApi = await pokemonClient.getPokemonByName(request);
			console.log(pokemonFromApi.sprites.front_default);
			return pokemonFromApi.sprites.front_default;
		} catch (err) {
			console.error(err);
			throw new Error(`${err}`);
		}
	}
}

export const PokeBotShowdown = new Pokemon();
