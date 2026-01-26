import type { PokemonEntity } from "../entities/pokemon.entity.js";
import type { UserEntity } from "../entities/users.entity.js";

export abstract class PokemonRepository {
  abstract findPokemonById(id: number): Promise<PokemonEntity>;
  abstract findPokemons(ids: number[]): Promise<PokemonEntity[]>;
  abstract findPokemonByName(name: string): Promise<PokemonEntity | null>;
  abstract updatePokemon(
    pokemon: PokemonEntity,
    data: Partial<PokemonEntity>,
  ): Promise<PokemonEntity>;
  abstract createPokemon(
    pokemon: PokemonEntity,
    user?: UserEntity,
  ): Promise<PokemonEntity>;
  abstract deletePokemonById(id: number): Promise<void>;
  abstract deletePokemonByName(name: string): Promise<void>;
}
