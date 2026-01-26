import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import { prisma } from "../../data/postgres/index.js";
import type { CreatePokemonDto } from "../../domain/dto/pokemon/create-pokemon.dto.js";
import type { UpdatePokemonDto } from "../../domain/dto/pokemon/update-pokemon.dto.js";

export class PokemonDataSourceImpl implements PokemonDataSource {
  async findPokemonById(id: number): Promise<PokemonEntity> {
    try {
      const pokemon = await prisma.pokemon.findUnique({ where: { id } });
      if (!pokemon) throw new Error("Pokemon not found in db");

      const pokemonSprites = JSON.parse(pokemon.sprites?.toString() as string);

      return PokemonEntity.fromObject({ ...pokemon, sprites: pokemonSprites });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Unknown error");
    }
  }

  async findPokemons(ids: number[]): Promise<PokemonEntity[]> {
    try {
      const pokemons = await prisma.pokemon.findMany({
        where: { id: { in: ids } },
      });

      if (!pokemons) throw new Error("Pokemons not found in db");

      const pokemonEntities: PokemonEntity[] = [];

      for (const pokemon of pokemons) {
        const pokemonSprites = JSON.parse(JSON.stringify(pokemon.sprites));

        pokemonEntities.push(
          PokemonEntity.fromObject({ ...pokemon, sprites: pokemonSprites }),
        );
      }

      return pokemonEntities;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(error.message);
      }
      throw new Error("Unknown error");
    }
  }

  async findPokemonByName(name: string): Promise<PokemonEntity> {
    try {
      const pokemon = await prisma.pokemon.findUnique({ where: { name } });
      if (!pokemon) throw new Error("Pokemon not found in db");
      const pokemonSprites = JSON.parse(pokemon.sprites?.toString() as string);

      console.log("Coming from datasource", "pokemonSprites: ", pokemonSprites);
      return PokemonEntity.fromObject({ ...pokemon, sprites: pokemonSprites });
    } catch (error) {
      if (error instanceof Error)
        if (error.message === "Pokemon not found in db") {
          throw new Error(error.message);
        } else {
          throw new Error(error.message);
        }
      throw new Error("Unknown error");
    }
  }

  async updatePokemon(
    pokemon: PokemonEntity,
    data: UpdatePokemonDto,
  ): Promise<PokemonEntity> {
    const dbPokemon = await prisma.pokemon.findUnique({
      where: { name: pokemon.name },
    });

    if (!dbPokemon) throw new Error("Pokemon not found in db");

    const updatedPokemon = await prisma.pokemon.update({
      where: { id: dbPokemon.id },
      data,
    });

    if (!updatedPokemon) throw new Error("Pokemon not found in db");

    const sprites = JSON.parse(JSON.stringify(updatedPokemon.sprites));

    return PokemonEntity.fromObject({
      ...updatedPokemon,
      sprites,
    });
  }

  async createPokemon(pokemon: CreatePokemonDto): Promise<PokemonEntity> {
    const { name, types, ability, sprites, timesCaught } = pokemon;

    const createdPokemon = await prisma.pokemon.create({
      data: {
        name,
        types,
        ability,
        sprites,
        timesCaught,
      },
    });

    const pokemonSprites = JSON.parse(
      createdPokemon.sprites?.toString() as string,
    );

    return PokemonEntity.fromObject({
      ...createdPokemon,
      sprites: pokemonSprites,
    });
  }

  async deletePokemonById(id: number): Promise<void> {
    const pokemon = await prisma.pokemon.findUnique({ where: { id } });
    if (pokemon) {
      await prisma.pokemon.delete({ where: { id } });
    }
  }

  async deletePokemonByName(name: string): Promise<void> {
    const pokemon = await prisma.pokemon.findUnique({ where: { name } });
    if (pokemon) {
      await prisma.pokemon.delete({ where: { id: pokemon.id } });
    }
  }
}
