import type { PokemonEntity } from "../entities/pokemon.entity.js";

export abstract class PokemonDataSource {
  abstract findPokemonById(id: number): Promise<PokemonEntity>;
  abstract findPokemons(ids: number[]): Promise<PokemonEntity[]>;
  abstract findPokemonByName(name: string): Promise<PokemonEntity>;
  abstract updatePokemon(
    pokemon: PokemonEntity,
    data: Partial<PokemonEntity>,
  ): Promise<PokemonEntity>;
  abstract createPokemon(pokemon: any): Promise<PokemonEntity>;
  abstract deletePokemonById(id: number): Promise<void>;
  abstract deletePokemonByName(name: string): Promise<void>;
}
