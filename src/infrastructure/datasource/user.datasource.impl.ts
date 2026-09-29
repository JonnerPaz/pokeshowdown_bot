import { prisma } from "../../data/postgres/index.js";
import { UserDataSource } from "../../domain/datasource/user.datasource.js";
import { UserEntity } from "../../domain/entities/users.entity.js";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";

export class UserDataSourceImpl implements UserDataSource {
  public async findUserByTelegramId(telegramId: number | bigint): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
      include: { pokemons: true },
    });

    if (!user) return null;

    const pokemons = user.pokemons.map((pokemon) => {
      const { nickname, ...pokemonData } = pokemon;
      const sprites = JSON.parse(JSON.stringify(pokemon.sprites));
      return PokemonEntity.fromObject({
        ...pokemonData,
        sprites,
        ...(nickname && { nickname }),
      });
    });
    return new UserEntity({
      ...user,
      telegramId: user.telegramId !== null ? Number(user.telegramId) : null,
      pokemons,
    });
  }

  public async createUser(user: UserEntity): Promise<UserEntity> {
    const {
      pokemons,
      updatedAt,
      createdAt,
      username,
      telegramId,
      pokeballs,
      greatballs,
      ultraballs,
      masterballs,
      lastDailyAt,
      dailyStreak,
    } = user;

    const pokemonData = pokemons.map((pokemon) => {
      const entity = PokemonEntity.fromObject(pokemon);
      return {
        name: entity.name,
        types: entity.types,
        ability: entity.ability,
        sprites: entity.sprites,
        timesCaught: entity.timesCaught,
      };
    });

    const createdUser = await prisma.user.create({
      data: {
        username,
        telegramId: telegramId !== null ? BigInt(telegramId) : null,
        createdAt,
        updatedAt,
        pokeballs,
        greatballs,
        ultraballs,
        masterballs,
        lastDailyAt,
        dailyStreak,
        pokemons: {
          create: pokemonData,
        },
      },
      include: { pokemons: true },
    });

    const createdPokemons = createdUser.pokemons.map((pokemon) => {
      const { nickname, ...createdData } = pokemon;
      const sprites = JSON.parse(JSON.stringify(pokemon.sprites));
      return PokemonEntity.fromObject({
        ...createdData,
        sprites,
        ...(nickname && { nickname }),
      });
    });

    return new UserEntity({
      ...createdUser,
      telegramId: createdUser.telegramId !== null ? Number(createdUser.telegramId) : null,
      pokemons: createdPokemons,
    });
  }

  public async updateUser(user: UserEntity, data: Partial<UserEntity>): Promise<UserEntity> {
    if (!user.telegramId) {
      throw new Error("Cannot update user without telegramId");
    }
    const updateData: {
      username?: string;
      pokeballs?: number;
      greatballs?: number;
      ultraballs?: number;
      masterballs?: number;
      lastDailyAt?: Date | null;
      dailyStreak?: number;
      updatedAt?: Date;
    } = {};

    if (data.username !== undefined) updateData.username = data.username;
    if (data.pokeballs !== undefined) updateData.pokeballs = data.pokeballs;
    if (data.greatballs !== undefined) updateData.greatballs = data.greatballs;
    if (data.ultraballs !== undefined) updateData.ultraballs = data.ultraballs;
    if (data.masterballs !== undefined) updateData.masterballs = data.masterballs;
    if (data.lastDailyAt !== undefined) updateData.lastDailyAt = data.lastDailyAt;
    if (data.dailyStreak !== undefined) updateData.dailyStreak = data.dailyStreak;
    updateData.updatedAt = new Date();

    const updatedUser = await prisma.user.update({
      where: { telegramId: BigInt(user.telegramId) },
      data: updateData,
      include: { pokemons: true },
    });

    const pokemons = updatedUser.pokemons.map((pokemon) => {
      const { nickname, ...pokemonData } = pokemon;
      const sprites = JSON.parse(JSON.stringify(pokemon.sprites));
      return PokemonEntity.fromObject({
        ...pokemonData,
        sprites,
        ...(nickname && { nickname }),
      });
    });

    return new UserEntity({
      ...updatedUser,
      telegramId: updatedUser.telegramId !== null ? Number(updatedUser.telegramId) : null,
      pokemons,
    });
  }

  public async deleteUserByTelegramId(telegramId: number | bigint): Promise<void> {
    await prisma.user.delete({ where: { telegramId: BigInt(telegramId) } });
  }
}
