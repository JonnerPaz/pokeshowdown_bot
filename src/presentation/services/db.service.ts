import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import { PokeApiService } from "./pokeapi.service.js";

export class DBService {
  currentPokemon: PokemonEntity | null = null;

  constructor(
    private readonly userDataSource: UserDataSource,
    private readonly pokemonDataSource: PokemonDataSource,
    private readonly pokemonService: PokeApiService,
  ) {}

  async createUser(user: UserEntity) {
    return await this.userDataSource.createUser(user);
  }

  async findUserById(id: number) {
    return await this.userDataSource.findUserById(id);
  }

  async findUserByUsername(username: string) {
    return await this.userDataSource.findUserByUsername(username);
  }

  async findPokemonById(id: number) {
    return await this.pokemonDataSource.findPokemonById(id);
  }

  async findPokemons(ids: number[]) {
    return await this.pokemonDataSource.findPokemons(ids);
  }

  async findPokemonByName(name: string) {
    return await this.pokemonDataSource.findPokemonByName(name);
  }

  async createPokemon(pokemon?: string): Promise<PokemonEntity> {
    const newPokemon = await this.pokemonService.createPokemon(pokemon);
    this.setCurrentPokemon = newPokemon;
    return newPokemon;
  }

  async insertPokemonIntoDB(pokemon: PokemonEntity, user?: UserEntity) {
    return await this.pokemonDataSource.createPokemon(pokemon, user);
  }

  async updatePokemon(pokemon: PokemonEntity, data: Partial<PokemonEntity>) {
    return await this.pokemonDataSource.updatePokemon(pokemon, data);
  }

  async updateUser(user: UserEntity, data: Partial<UserEntity>) {
    return await this.userDataSource.updateUser(user, data);
  }

  async deleteUserByUsername(username: string) {
    return await this.userDataSource.deleteUserByUsername(username);
  }

  get getCurrentPokemon() {
    return this.pokemonService.getCurrentPokemon;
  }

  set setCurrentPokemon(pokemon: PokemonEntity | null) {
    this.pokemonService.setCurrentPokemon = pokemon;
  }

  async evolvePokemon(pokemon: PokemonEntity) {
    const evolvedPokemon = await this.pokemonService.evolvePokemon(pokemon);
    const updatedPokemon = await this.updatePokemon(pokemon, {
      ...evolvedPokemon,
    });
    return updatedPokemon;
  }

  async createStarterPokemon() {
    return await this.pokemonService.createStarterPokemon();
  }
}
