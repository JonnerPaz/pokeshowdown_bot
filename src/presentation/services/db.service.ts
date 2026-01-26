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

  createUser(user: CreateUserDto) {
    return this.userRepository.createUser(user);
  }

  findUserById(id: number) {
    return this.userRepository.findUserById(id);
  }

  findUserByUsername(username: string) {
    return this.userRepository.findUserByUsername(username);
  }

  findPokemonById(id: number) {
    return this.pokemonRepository.findPokemonById(id);
  }

  findPokemons(ids: number[]) {
    return this.pokemonRepository.findPokemons(ids);
  }

  findPokemonByName(name: string) {
    return this.pokemonRepository.findPokemonByName(name);
  }

  createPokemon(pokemon?: string): Promise<PokemonEntity> {
    return this.pokemonService.createPokemon(pokemon);
  }

  updatePokemon(pokemon: PokemonEntity, data: Partial<PokemonEntity>) {
    return this.pokemonRepository.updatePokemon(pokemon, data);
  }

  updateUser(user: UserEntity, data: UpdateUserDto) {
    return this.userRepository.updateUser(user, data);
  }

  deleteUserByUsername(username: string) {
    return this.userRepository.deleteUserByUsername(username);
  }

  get getCurrentPokemon() {
    return this.pokemonService.getCurrentPokemon;
  }

  set setCurrentPokemon(pokemon: PokemonEntity) {
    this.pokemonService.setCurrentPokemon = pokemon;
  }

  evolvePokemon(pokemon: PokemonEntity) {
    return this.pokemonService.evolvePokemon(pokemon);
  }

  createStarterPokemon() {
    return this.pokemonService.createStarterPokemon();
  }
}
