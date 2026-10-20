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
    // Require a persisted identity: a name-only fallback could target another
    // trainer's pokemon that happens to share the same species name.
    if (!pokemon.id) {
      throw new Error("Pokemon ID is required to update a pokemon");
    }

    const dbPokemon = await prisma.pokemon.findUnique({
      where: { id: pokemon.id },
    });

    if (!dbPokemon) throw new Error("Pokemon not found in db");

    const updateData: {
      name?: string;
      types?: string[];
      ability?: string;
      sprites?: PokemonEntity["sprites"];
      timesCaught?: number;
      nickname?: string | null;
      isShiny?: boolean;
      isInParty?: boolean;
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
    if (typeof data.isInParty === "boolean") {
      updateData.isInParty = data.isInParty;
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
    const {
      name,
      types,
      ability,
      sprites,
      timesCaught,
      nickname,
      isShiny,
      isInParty = true,
    } = pokemon;

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
          isInParty,
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

  async deletePokemon(target: PokemonEntity | number): Promise<void> {
    const id = typeof target === "number" ? target : target.id;
    if (!id) throw new Error("Pokemon ID is required to delete a pokemon");
    await prisma.pokemon.delete({ where: { id } });
  }

  async tradePokemon(
    userA: UserEntity,
    pokemonA: PokemonEntity,
    userB: UserEntity,
    pokemonB: PokemonEntity,
  ): Promise<void> {
    if (!userA.id || !userB.id) throw new Error("User ID is missing for trade");
    if (!pokemonA.id || !pokemonB.id) throw new Error("Pokemon ID is missing for trade");

    await prisma.$transaction(async (tx) => {
      await tx.pokemon.update({
        where: { id: pokemonA.id! },
        data: { userId: userB.id! },
      });
      await tx.pokemon.update({
        where: { id: pokemonB.id! },
        data: { userId: userA.id! },
      });
      if (userA.buddyPokemonId === pokemonA.id) {
        await tx.user.update({
          where: { id: userA.id! },
          data: { buddyPokemonId: null },
        });
      }
      if (userB.buddyPokemonId === pokemonB.id) {
        await tx.user.update({
          where: { id: userB.id! },
          data: { buddyPokemonId: null },
        });
      }
    });
  }

  async setPokemonPartyStatus(pokemonId: number, isInParty: boolean): Promise<PokemonEntity> {
    const updated = await prisma.pokemon.update({
      where: { id: pokemonId },
      data: { isInParty },
    });
    const { nickname: updatedNickname, ...updatedData } = updated;
    const sprites = JSON.parse(JSON.stringify(updated.sprites));
    return PokemonEntity.fromObject({
      ...updatedData,
      sprites,
      ...(updatedNickname && { nickname: updatedNickname }),
    });
  }

  async swapPokemonPartyStatus(boxPokemonId: number, partyPokemonId: number): Promise<void> {
    await prisma.$transaction([
      prisma.pokemon.update({
        where: { id: boxPokemonId },
        data: { isInParty: true },
      }),
      prisma.pokemon.update({
        where: { id: partyPokemonId },
        data: { isInParty: false },
      }),
    ]);
  }
}
