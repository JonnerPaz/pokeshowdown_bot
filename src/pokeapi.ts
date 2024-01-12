const pokeapi = "https://pokeapi.co/api/v2/pokemon";

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
	createPokemon(pokemon: PokemonSummary) {
		// console.log(pokemon);
		// const newPokemon: PokemonSummary = {
		// 	id: pokemon.id,
		// 	// ability: pokemon,
		// }
	}

	async pokeRenderer(pokemon: string): Promise<any> {
		// receives and converts raw data from telegram api to pokeapi
		const request = pokemon.toLowerCase();
		const query = await fetch(`${pokeapi}/${request}`);
		const result: any = await query.json();

		return result.sprites.front_default;
		// sends raw api request to createPokemon method
		// this.createPokemon(result);
	}

	get getPokemonSummary() {
		return;
	}
}

export const pokeShowdown = new Pokemon();
