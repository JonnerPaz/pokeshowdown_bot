import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import { prisma } from "../../data/postgres/index.js";

export class PokemonDataSourceImpl implements PokemonDataSource {
  async findPokemonById(id: number): Promise<PokemonEntity> {
    try {
      const pokemon = await prisma.pokemon.findUnique({ where: { id } });
      if (!pokemon) throw new Error("Pokemon not found in db");

      const { nickname, ...pokemonData } = pokemon;
      const pokemonSprites = JSON.parse(pokemon.sprites?.toString() as string);

      return PokemonEntity.fromObject({
        ...pokemonData,
        sprites: pokemonSprites,
        ...(nickname && { nickname }),
      });
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
        const { nickname, ...pokemonData } = pokemon;
        const pokemonSprites = JSON.parse(JSON.stringify(pokemon.sprites));

        pokemonEntities.push(
          PokemonEntity.fromObject({
            ...pokemonData,
            sprites: pokemonSprites,
            ...(nickname && { nickname }),
          }),
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

  async findPokemonByName(name: string): Promise<PokemonEntity | null> {
    try {
      // name is not unique, using findFirst instead of findUnique
      const pokemon = await prisma.pokemon.findFirst({ where: { name } });
      if (!pokemon) return null;

      const { nickname, ...pokemonData } = pokemon;
      const pokemonSprites = JSON.parse(JSON.stringify(pokemon.sprites));

      return PokemonEntity.fromObject({
        ...pokemonData,
        sprites: pokemonSprites,
        ...(nickname && { nickname }),
      });
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
    data: Partial<PokemonEntity>,
  ): Promise<PokemonEntity> {
    let dbPokemon;

    // Try finding by ID first if available
    if (pokemon.id) {
      dbPokemon = await prisma.pokemon.findUnique({
        where: { id: pokemon.id },
      });
    } else {
      // Fallback to name search (findFirst) - behavior from original code but safer
      dbPokemon = await prisma.pokemon.findFirst({
        where: { name: pokemon.name },
      });
    }

    if (!dbPokemon) throw new Error("Pokemon not found in db");

    const updateData: {
      name?: string;
      types?: string[];
      ability?: string;
      sprites?: PokemonEntity["sprites"];
      timesCaught?: number;
      nickname?: string | null;
    } = {};

    if (typeof data.name === "string") updateData.name = data.name;
    if (Array.isArray(data.types)) updateData.types = data.types;
    if (typeof data.ability === "string") updateData.ability = data.ability;
    if (data.sprites) updateData.sprites = data.sprites;
    if (typeof data.timesCaught === "number") {
      updateData.timesCaught = data.timesCaught;
    }
    if (typeof data.nickname === "string") {
      updateData.nickname = data.nickname;
    }

    if (Object.keys(updateData).length === 0) {
      const { nickname, ...pokemonData } = dbPokemon;
      const sprites = JSON.parse(JSON.stringify(dbPokemon.sprites));
      return PokemonEntity.fromObject({
        ...pokemonData,
        sprites,
        ...(nickname && { nickname }),
      });
    }

    const updatedPokemon = await prisma.pokemon.update({
      where: { id: dbPokemon.id },
      data: updateData,
    });

    if (!updatedPokemon) throw new Error("Pokemon not found in db");

    const { nickname, ...pokemonData } = updatedPokemon;
    const sprites = JSON.parse(JSON.stringify(updatedPokemon.sprites));

    return PokemonEntity.fromObject({
      ...pokemonData,
      sprites,
      ...(nickname && { nickname }),
    });
  }

  async createPokemon(
    pokemon: PokemonEntity,
    user?: UserEntity,
  ): Promise<PokemonEntity> {
    const { name, types, ability, sprites, timesCaught, nickname } = pokemon;

    const createdPokemon = await prisma.pokemon.create({
      data: {
        name,
        types,
        ability,
        sprites,
        timesCaught,
        nickname: nickname ?? null,
      },
    });

    if (user && user.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          pokemons: {
            connect: {
              id: createdPokemon.id,
            },
          },
        },
      });
    }

    const { nickname: createdNickname, ...createdPokemonData } = createdPokemon;
    const pokemonSprites = JSON.parse(JSON.stringify(createdPokemon.sprites));

    return PokemonEntity.fromObject({
      ...createdPokemonData,
      sprites: pokemonSprites,
      ...(createdNickname && { nickname: createdNickname }),
    });
  }

  async deletePokemonById(id: number): Promise<void> {
    const pokemon = await prisma.pokemon.findUnique({ where: { id } });
    if (pokemon) {
      await prisma.pokemon.delete({ where: { id } });
    }
  }

  async deletePokemonByName(name: string): Promise<void> {
    // Using findFirst because name is not unique
    const pokemon = await prisma.pokemon.findFirst({ where: { name } });
    if (pokemon) {
      await prisma.pokemon.delete({ where: { id: pokemon.id } });
    }
  }

  async tradePokemon(
    userA: UserEntity,
    pokemonA: PokemonEntity,
    userB: UserEntity,
    pokemonB: PokemonEntity,
  ): Promise<void> {
    if (!userA.id || !userB.id) throw new Error("User ID is missing for trade");
    if (!pokemonA.id || !pokemonB.id)
      throw new Error("Pokemon ID is missing for trade");

    await prisma.$transaction([
      prisma.pokemon.update({
        where: { id: pokemonA.id },
        data: { userId: userB.id },
      }),
      prisma.pokemon.update({
        where: { id: pokemonB.id },
        data: { userId: userA.id },
      }),
    ]);
  }
}
