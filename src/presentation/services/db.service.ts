import type { CreateUserDto } from "../../domain/dto/user/create-user.dto.js";
import type { UpdateUserDto } from "../../domain/dto/user/update-user.dto.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import { PokemonRepository } from "../../domain/repositories/pokemon.repository.js";
import { UserRepository } from "../../domain/repositories/user.repository.js";
import { PokeApiService } from "./pokeapi.service.js";

export class DBService {
  currentPokemon: PokemonEntity | null = null;

  constructor(
    private readonly userRepository: UserRepository,
    private readonly pokemonRepository: PokemonRepository,
    private readonly pokemonService: PokeApiService,
  ) {}

  async createUser(user: CreateUserDto) {
    return await this.userRepository.createUser(user);
  }

  async findUserById(id: number) {
    return await this.userRepository.findUserById(id);
  }

  async findUserByUsername(username: string) {
    return await this.userRepository.findUserByUsername(username);
  }

  async findPokemonById(id: number) {
    return await this.pokemonRepository.findPokemonById(id);
  }

  async findPokemons(ids: number[]) {
    return await this.pokemonRepository.findPokemons(ids);
  }

  async findPokemonByName(name: string) {
    return await this.pokemonRepository.findPokemonByName(name);
  }

  async createPokemon(pokemon?: string): Promise<PokemonEntity> {
    const newPokemon = await this.pokemonService.createPokemon(pokemon);
    this.setCurrentPokemon = newPokemon;
    return newPokemon;
  }

  async insertPokemonIntoDB(pokemon: PokemonEntity, user?: UserEntity) {
    return await this.pokemonRepository.createPokemon(pokemon, user);
  }

  async updatePokemon(pokemon: PokemonEntity, data: Partial<PokemonEntity>) {
    return await this.pokemonRepository.updatePokemon(pokemon, data);
  }

  async updateUser(user: UserEntity, data: UpdateUserDto) {
    return await this.userRepository.updateUser(user, data);
  }

  async deleteUserByUsername(username: string) {
    return await this.userRepository.deleteUserByUsername(username);
  }

  get getCurrentPokemon() {
    return this.pokemonService.getCurrentPokemon;
  }

  set setCurrentPokemon(pokemon: PokemonEntity | null) {
    this.pokemonService.setCurrentPokemon = pokemon;
  }

  async evolvePokemon(pokemon: PokemonEntity) {
    return await this.pokemonService.evolvePokemon(pokemon);
  }

  async createStarterPokemon() {
    return await this.pokemonService.createStarterPokemon();
  }
}
