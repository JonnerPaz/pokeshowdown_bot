import { prisma } from "../../data/postgres/index.js";
import { UserDataSource } from "../../domain/datasource/user.datasource.js";
import { UserEntity } from "../../domain/entities/users.entity.js";
import { ErrorEntity } from "../../domain/entities/error.entity.js";
import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";

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

    const pokemons = JSON.parse(JSON.stringify(user.pokemons));
    return new UserEntity({ ...user, pokemons });
  }

  public async findUserByUsername(
    username: string,
  ): Promise<UserEntity | null> {
    const user = await prisma.user.findUnique({
      where: { username },
      include: { pokemons: true },
    });

    if (!user) return null;

    const pokemons = JSON.parse(JSON.stringify(user.pokemons));
    return new UserEntity({ ...user, pokemons });
  }

  public async createUser(user: UserEntity): Promise<UserEntity> {
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

    return new UserEntity({ ...createdUser, pokemons });
  }

  public async updateUser(
    user: UserEntity,
    data: Partial<UserEntity>,
  ): Promise<UserEntity> {
    const { id } = user;
    if (!id) throw new Error("Id not found");

    const authUser = await this.findUserById(id);
    if (!authUser) throw new Error("Username not found");

    const validPokemonUpdates = data.pokemons
      ? data.pokemons.filter(
          (p) => p.id && authUser.pokemons.map((p) => p.id).includes(p.id),
        )
      : [];

    const pokemonUpdateOperations = validPokemonUpdates.map((pokemon) => ({
      where: { id: pokemon.id! },
      data: { timesCaught: pokemon.timesCaught },
    }));

    const updatedUserFromDb = await prisma.user.update({
      where: { id },
      data: {
        ...(data.username && { username: data.username }),

        // Update the relations
        pokemons: {
          update: pokemonUpdateOperations,
        },
      },

      // Include pokemons so we can reconstruct the Entity's pokemonIds array accurately
      include: {
        pokemons: {
          select: { id: true },
        },
      },
    });

    return new UserEntity({
      ...updatedUserFromDb,
      pokemons: JSON.parse(JSON.stringify(updatedUserFromDb.pokemons)),
    });
  }

  public async deleteUserById(id: number): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  public async deleteUserByUsername(username: string): Promise<void> {
    await prisma.user.delete({ where: { username } });
  }
}
