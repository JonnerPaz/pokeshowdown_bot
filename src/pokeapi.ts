import { PokemonClient } from "pokenode-ts";

// const pokeapi = "https://pokeapi.co/api/v2/pokemon";

// Every request will return a promise
const pokemonClient = new PokemonClient();

interface PokemonSummary {
	id: number;
	ability: {
		name: string;
		url: string;
		is_hidden: boolean;
	};
	moves: {
		move: {
			name: string;
			url: string;
		};
	};
	name: string;
	type: {
		name: string;
		url: string;
	};
}

class Pokemon {
	async getPokemon(pokeRequest: PokemonClient) {}

	async catchPokemon() {}

	async pokeRenderer(pokemon: string): Promise<any> {
		try {
			// receives and converts raw data from telegram api to pokeapi
			const request = pokemon.toLowerCase();
			const query = await pokemonClient.getPokemonByName(request);
			console.log(query.sprites.front_default);
			return query.sprites.front_default;
		} catch (err) {
			console.error(err);
		}
	}

	get getPokemonSummary() {
		return;
	}
}

export const pokeShowdown = new Pokemon();
