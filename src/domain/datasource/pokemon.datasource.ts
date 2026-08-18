import type { PokemonEntity } from "../entities/pokemon.entity.js";
import type { UserEntity } from "../entities/users.entity.js";

export abstract class PokemonDataSource {
  abstract findUserPokemonByNameAndVariant(
    userId: number,
    name: string,
    isShiny: boolean,
  ): Promise<PokemonEntity | null>;
  abstract updatePokemon(
    pokemon: PokemonEntity,
    data: Partial<PokemonEntity>,
  ): Promise<PokemonEntity>;
  abstract createPokemon(pokemon: PokemonEntity, user?: UserEntity): Promise<PokemonEntity>;
  abstract tradePokemon(
    userA: UserEntity,
    pokemonA: PokemonEntity,
    userB: UserEntity,
    pokemonB: PokemonEntity,
  ): Promise<void>;
}
