import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import { EVOLVE_CAP } from "../../domain/data/constants.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";

export function getPokemonFrontSprite(pokemon: PokemonEntity): string {
  return pokemon.isShiny ? pokemon.sprites.frontShiny : pokemon.sprites.frontDefault;
}

export async function evolvePokemonOperation(
  pokemon: PokemonEntity,
  pokeApi: PokeApiService,
  pokemonDataSource: PokemonDataSource,
  ownerId?: number,
): Promise<PokemonEntity> {
  const evolvedPokemon = await pokeApi.evolvePokemon(pokemon);
  if (evolvedPokemon.name === pokemon.name) {
    return pokemon;
  }

  const remainingCaught = Math.max(0, pokemon.timesCaught - EVOLVE_CAP);

  // If the trainer already owns the evolved form (same shiny variant), merge the
  // catch counter into that row and drop the pre-evolution duplicate instead of
  // ending up with two rows sharing the same name.
  if (ownerId !== undefined) {
    const existing = await pokemonDataSource.findUserPokemonByNameAndVariant(
      ownerId,
      evolvedPokemon.name,
      pokemon.isShiny,
    );

    if (existing && existing.id !== pokemon.id) {
      const merged = await pokemonDataSource.updatePokemon(existing, {
        timesCaught: existing.timesCaught + remainingCaught,
      });
      if (pokemon.id !== null) {
        await pokemonDataSource.deletePokemon(pokemon);
      }
      return merged;
    }
  }

  return await pokemonDataSource.updatePokemon(pokemon, {
    name: evolvedPokemon.name,
    types: evolvedPokemon.types,
    ability: evolvedPokemon.ability,
    sprites: evolvedPokemon.sprites,
    isShiny: pokemon.isShiny,
    timesCaught: remainingCaught,
  });
}
