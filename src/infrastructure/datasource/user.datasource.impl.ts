import { prisma } from "../../data/postgres/index.js";
import { UserDataSource } from "../../domain/datasource/user.datasource.js";
import { UserEntity } from "../../domain/entities/users.entity.js";
import { ErrorEntity } from "../../domain/entities/error.entity.js";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { CreateUserDto } from "../../domain/dto/user/create-user.dto.js";
import type { UpdateUserDto } from "../../domain/dto/user/update-user.dto.js";

export class UserDataSourceImpl implements UserDataSource {
  constructor(
    public readonly error: ErrorEntity = new ErrorEntity("Generic Error"),
  ) {}

  public async findUserById(id: number): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      include: { pokemons: true },
    });

    if (!user) return null;

    const pokemonIds = user.pokemons.map((pokemon) => pokemon.id);
    return new UserEntity({ ...user, pokemonIds });
  }

  public async findUserByUsername(
    username: string,
  ): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { pokemons: true },
    });

    if (!user) return null;

    const pokemonIds = user.pokemons.map((pokemon) => pokemon.id);
    return new UserEntity({ ...user, pokemonIds });
  }

  public async createUser(user: CreateUserDto): Promise<UserEntity> {
    const { pokemons, updatedAt, createdAt, username } = user;

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
        createdAt,
        updatedAt,
        pokemons: {
          create: pokemonData,
        },
      },
      include: { pokemons: true },
    });

    const pokemonIds = createdUser.pokemons.map((pokemon) => pokemon.id);

    return new UserEntity({ ...createdUser, pokemonIds });
  }

  public async updateUser(
    user: UserEntity,
    data: UpdateUserDto,
  ): Promise<UserEntity> {
    const { id } = user;
    const authUser = await this.findUserById(id);
    if (!authUser) throw new Error("Username not found");

    const pokemonToUpdate = data.pokemons.find((pokemon) =>
      authUser.pokemonIds.includes(pokemon.id as number),
    );

    if (!pokemonToUpdate || pokemonToUpdate.id === null)
      throw new Error("Pokemon not found");

    const { username, pokemonIds } = authUser;
    const updatedUser = await prisma.user.update({
      where: { username },
      data: {
        ...user,
        pokemons: {
          update: {
            where: { id: pokemonToUpdate.id },
            data: { timesCaught: pokemonToUpdate.timesCaught },
          },
        },
      },
    });

    return new UserEntity({ ...updatedUser, pokemonIds });
  }

  public async deleteUserById(id: number): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  public async deleteUserByUsername(username: string): Promise<void> {
    await prisma.user.delete({ where: { username } });
  }
}
