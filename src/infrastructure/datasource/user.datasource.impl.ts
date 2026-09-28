import { prisma } from "../../data/postgres/index.js";
import { UserDataSource } from "../../domain/datasource/user.datasource.js";
import { UserEntity } from "../../domain/entities/users.entity.js";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";

export class UserDataSourceImpl implements UserDataSource {
  public async findUserByTelegramId(telegramId: number): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { telegramId },
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
    return new UserEntity({ ...user, pokemons });
  }

  public async createUser(user: UserEntity): Promise<UserEntity> {
    const { pokemons, updatedAt, createdAt, username, telegramId } = user;

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
        telegramId,
        createdAt,
        updatedAt,
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

    return new UserEntity({ ...createdUser, pokemons: createdPokemons });
  }

  public async deleteUserByTelegramId(telegramId: number): Promise<void> {
    await prisma.user.delete({ where: { telegramId } });
  }
}
