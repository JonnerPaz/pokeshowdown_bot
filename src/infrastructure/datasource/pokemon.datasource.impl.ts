import type { PokemonDataSource } from "../../domain/datasource/pokemon.datasource.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import { prisma } from "../../data/postgres/index.js";

export class PokemonDataSourceImpl implements PokemonDataSource {
  async findUserPokemonByNameAndVariant(
    userId: number,
    name: string,
    isShiny: boolean,
  ): Promise<PokemonEntity | null> {
    const pokemon = await prisma.pokemon.findFirst({
      where: {
        userId,
        name,
        isShiny,
      },
    });

    if (!pokemon) return null;

    const { nickname, ...pokemonData } = pokemon;
    const pokemonSprites = JSON.parse(JSON.stringify(pokemon.sprites));

    return PokemonEntity.fromObject({
      ...pokemonData,
      sprites: pokemonSprites,
      ...(nickname && { nickname }),
    });
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
      isShiny?: boolean;
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
    if (typeof data.isShiny === "boolean") {
      updateData.isShiny = data.isShiny;
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

  async createPokemon(pokemon: PokemonEntity, user?: UserEntity): Promise<PokemonEntity> {
    const { name, types, ability, sprites, timesCaught, nickname, isShiny } = pokemon;

    const createdPokemon = await prisma.$transaction(async (tx) => {
      const created = await tx.pokemon.create({
        data: {
          name,
          types,
          ability,
          sprites,
          timesCaught,
          isShiny,
          nickname: nickname ?? null,
          ...(user?.id && { userId: user.id }),
        },
      });

      if (user?.id) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            pokemons: {
              connect: {
                id: created.id,
              },
            },
          },
        });
      }

      return created;
    });

    const { nickname: createdNickname, ...createdPokemonData } = createdPokemon;
    const pokemonSprites = JSON.parse(JSON.stringify(createdPokemon.sprites));

    return PokemonEntity.fromObject({
      ...createdPokemonData,
      sprites: pokemonSprites,
      ...(createdNickname && { nickname: createdNickname }),
    });
  }

  async tradePokemon(
    userA: UserEntity,
    pokemonA: PokemonEntity,
    userB: UserEntity,
    pokemonB: PokemonEntity,
  ): Promise<void> {
    if (!userA.id || !userB.id) throw new Error("User ID is missing for trade");
    if (!pokemonA.id || !pokemonB.id) throw new Error("Pokemon ID is missing for trade");

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
