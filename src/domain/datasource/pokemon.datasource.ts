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
  abstract setPokemonPartyStatus(pokemonId: number, isInParty: boolean): Promise<PokemonEntity>;
  abstract swapPokemonPartyStatus(boxPokemonId: number, partyPokemonId: number): Promise<void>;
  abstract deletePokemon(pokemonId: number): Promise<void>;
}
