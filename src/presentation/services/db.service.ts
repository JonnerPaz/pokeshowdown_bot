import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import { PokeApiService } from "./pokeapi.service.js";

export class DBService {
  constructor(
    private readonly userDataSource: UserDataSource,
    private readonly pokemonDataSource: PokemonDataSource,
    private readonly pokemonService: PokeApiService,
  ) {}

  async createUser(user: UserEntity) {
    return await this.userDataSource.createUser(user);
  }

  async findUserByTelegramId(telegramId: number) {
    return await this.userDataSource.findUserByTelegramId(telegramId);
  }

  async findUserPokemonByNameAndVariant(userId: number, name: string, isShiny: boolean) {
    return await this.pokemonDataSource.findUserPokemonByNameAndVariant(userId, name, isShiny);
  }

  async createPokemon(pokemon?: string): Promise<PokemonEntity> {
    return await this.pokemonService.createPokemon(pokemon);
  }

  async insertPokemonIntoDB(pokemon: PokemonEntity, user?: UserEntity) {
    return await this.pokemonDataSource.createPokemon(pokemon, user);
  }

  async updatePokemon(pokemon: PokemonEntity, data: Partial<PokemonEntity>) {
    return await this.pokemonDataSource.updatePokemon(pokemon, data);
  }

  async deleteUserByTelegramId(telegramId: number) {
    return await this.userDataSource.deleteUserByTelegramId(telegramId);
  }

  async evolvePokemon(pokemon: PokemonEntity) {
    const evolvedPokemon = await this.pokemonService.evolvePokemon(pokemon);
    const updatedPokemon = await this.updatePokemon(pokemon, {
      name: evolvedPokemon.name,
      types: evolvedPokemon.types,
      ability: evolvedPokemon.ability,
      sprites: evolvedPokemon.sprites,
      isShiny: pokemon.isShiny,
      timesCaught: pokemon.timesCaught,
    });
    return updatedPokemon;
  }

  async createStarterPokemon() {
    return await this.pokemonService.createStarterPokemon();
  }

  async tradePokemon(
    userA: UserEntity,
    pokemonA: PokemonEntity,
    userB: UserEntity,
    pokemonB: PokemonEntity,
  ) {
    return await this.pokemonDataSource.tradePokemon(userA, pokemonA, userB, pokemonB);
  }
}
