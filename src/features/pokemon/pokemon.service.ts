import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import { EVOLVE_CAP } from "../../domain/data/constants.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";

export async function evolvePokemonOperation(
  pokemon: PokemonEntity,
  pokeApi: PokeApiService,
  pokemonDataSource: PokemonDataSource,
): Promise<PokemonEntity> {
  const evolvedPokemon = await pokeApi.evolvePokemon(pokemon);
  if (evolvedPokemon.name === pokemon.name) {
    return pokemon;
  }

  const updatedPokemon = await pokemonDataSource.updatePokemon(pokemon, {
    name: evolvedPokemon.name,
    types: evolvedPokemon.types,
    ability: evolvedPokemon.ability,
    sprites: evolvedPokemon.sprites,
    isShiny: pokemon.isShiny,
    timesCaught: Math.max(0, pokemon.timesCaught - EVOLVE_CAP),
  });
  return updatedPokemon;
}
