import { PokemonRepository } from "../../domain/repositories/pokemon.repository.js";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";

export class PokemonRepositoryImpl implements PokemonRepository {
  constructor(private readonly datasource: PokemonDataSource) {}

  async findPokemonById(id: number): Promise<PokemonEntity> {
    return await this.datasource.findPokemonById(id);
  }

  async findPokemons(ids: number[]): Promise<PokemonEntity[]> {
    return await this.datasource.findPokemons(ids);
  }

  async findPokemonByName(name: string): Promise<PokemonEntity> {
    return await this.datasource.findPokemonByName(name);
  }

  async updatePokemon(
    pokemon: PokemonEntity,
    data: Partial<PokemonEntity>,
  ): Promise<PokemonEntity> {
    return await this.datasource.updatePokemon(pokemon, data);
  }

  async createPokemon(pokemon: any): Promise<PokemonEntity> {
    return await this.datasource.createPokemon(pokemon);
  }

  async deletePokemonById(id: number): Promise<void> {
    return await this.datasource.deletePokemonById(id);
  }

  async deletePokemonByName(name: string): Promise<void> {
    return await this.datasource.deletePokemonByName(name);
  }
}
