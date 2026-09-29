import type { UserDataSource } from "../../src/domain/datasource/user.datasource.js";
import type { PokemonDataSource } from "../../src/domain/datasource/pokemon.datasource.js";
import { UserEntity } from "../../src/domain/entities/users.entity.js";
import { PokemonEntity } from "../../src/domain/entities/pokemon.entity.js";

export class InMemoryUserDataSource implements UserDataSource {
  public users = new Map<number, UserEntity>();
  private nextUserId = 1;

  public async findUserByTelegramId(telegramId: number | bigint): Promise<UserEntity | null> {
    const targetBigInt = BigInt(telegramId);
    for (const user of this.users.values()) {
      if (user.telegramId !== null && BigInt(user.telegramId) === targetBigInt) {
        return user;
      }
    }
    return null;
  }

  public async createUser(user: UserEntity): Promise<UserEntity> {
    const id = user.id ?? this.nextUserId++;
    const createdUser = new UserEntity({
      id,
      telegramId: user.telegramId,
      username: user.username,
      createdAt: user.createdAt ?? new Date(),
      updatedAt: user.updatedAt ?? new Date(),
      pokemons: user.pokemons ?? [],
      pokeballs: user.pokeballs,
      greatballs: user.greatballs,
      ultraballs: user.ultraballs,
      masterballs: user.masterballs,
      lastDailyAt: user.lastDailyAt,
      dailyStreak: user.dailyStreak,
      wins: user.wins,
      losses: user.losses,
      buddyPokemonId: user.buddyPokemonId,
    });
    this.users.set(id, createdUser);
    return createdUser;
  }

  public async updateUser(user: UserEntity, data: Partial<UserEntity>): Promise<UserEntity> {
    const existing = await this.findUserByTelegramId(user.telegramId!);
    if (!existing || existing.id === null) {
      throw new Error("User not found");
    }
    const updated = new UserEntity({
      id: existing.id,
      telegramId: existing.telegramId,
      username: data.username ?? existing.username,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
      pokemons: data.pokemons ?? existing.pokemons,
      pokeballs: data.pokeballs ?? existing.pokeballs,
      greatballs: data.greatballs ?? existing.greatballs,
      ultraballs: data.ultraballs ?? existing.ultraballs,
      masterballs: data.masterballs ?? existing.masterballs,
      lastDailyAt: data.lastDailyAt !== undefined ? data.lastDailyAt : existing.lastDailyAt,
      dailyStreak: data.dailyStreak ?? existing.dailyStreak,
      wins: data.wins ?? existing.wins,
      losses: data.losses ?? existing.losses,
      buddyPokemonId:
        data.buddyPokemonId !== undefined ? data.buddyPokemonId : existing.buddyPokemonId,
    });
    this.users.set(existing.id, updated);
    return updated;
  }

  public async getLeaderboard(limit: number = 10): Promise<UserEntity[]> {
    return Array.from(this.users.values())
      .filter((u) => u.wins > 0 || u.losses > 0)
      .sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return a.losses - b.losses;
      })
      .slice(0, limit);
  }

  public async deleteUserByTelegramId(telegramId: number | bigint): Promise<void> {
    const existing = await this.findUserByTelegramId(telegramId);
    if (!existing || existing.id === null) return;
    this.users.delete(existing.id);
  }

  public seedUser(user: UserEntity): void {
    const id = user.id ?? this.nextUserId++;
    user.id = id;
    this.users.set(id, user);
  }

  public clear(): void {
    this.users.clear();
    this.nextUserId = 1;
  }
}

export class InMemoryPokemonDataSource implements PokemonDataSource {
  public pokemons = new Map<number, { pokemon: PokemonEntity; userId?: number }>();
  private nextPokemonId = 1;

  constructor(private readonly userDataSource: InMemoryUserDataSource) {}

  public async findUserPokemonByNameAndVariant(
    userId: number,
    name: string,
    isShiny: boolean,
  ): Promise<PokemonEntity | null> {
    const user = this.userDataSource.users.get(userId);
    if (!user) return null;
    return (
      user.pokemons.find(
        (p) => p.name.toLowerCase() === name.toLowerCase() && p.isShiny === isShiny,
      ) ?? null
    );
  }

  public async createPokemon(pokemon: PokemonEntity, user?: UserEntity): Promise<PokemonEntity> {
    const id = pokemon.id ?? this.nextPokemonId++;
    const created = PokemonEntity.fromObject({
      ...pokemon,
      id,
    });

    if (user && user.id !== null && user.id !== undefined) {
      this.pokemons.set(id, { pokemon: created, userId: user.id });
      const storedUser = this.userDataSource.users.get(user.id);
      if (storedUser) {
        storedUser.pokemons.push(created);
      } else {
        user.pokemons.push(created);
      }
    } else {
      this.pokemons.set(id, { pokemon: created });
    }

    return created;
  }

  public async updatePokemon(
    pokemon: PokemonEntity,
    data: Partial<PokemonEntity>,
  ): Promise<PokemonEntity> {
    const id = pokemon.id ?? 1;
    const updated = PokemonEntity.fromObject({
      ...pokemon,
      ...data,
      id,
    });

    const entry = this.pokemons.get(id);
    if (entry) {
      entry.pokemon = updated;
      if (entry.userId) {
        const user = this.userDataSource.users.get(entry.userId);
        if (user) {
          user.pokemons = user.pokemons.map((p) => (p.id === id ? updated : p));
        }
      }
    } else {
      for (const user of this.userDataSource.users.values()) {
        const idx = user.pokemons.findIndex((p) => p.id === id);
        if (idx !== -1) {
          user.pokemons[idx] = updated;
          this.pokemons.set(id, {
            pokemon: updated,
            ...(user.id !== null ? { userId: user.id } : {}),
          });
        }
      }
    }

    return updated;
  }

  public async tradePokemon(
    userA: UserEntity,
    pokemonA: PokemonEntity,
    userB: UserEntity,
    pokemonB: PokemonEntity,
  ): Promise<void> {
    userA.pokemons = userA.pokemons.filter((p) => p.id !== pokemonA.id);
    userB.pokemons = userB.pokemons.filter((p) => p.id !== pokemonB.id);

    userA.pokemons.push(pokemonB);
    userB.pokemons.push(pokemonA);

    if (pokemonA.id !== null && userB.id !== null) {
      this.pokemons.set(pokemonA.id, { pokemon: pokemonA, userId: userB.id });
    }
    if (pokemonB.id !== null && userA.id !== null) {
      this.pokemons.set(pokemonB.id, { pokemon: pokemonB, userId: userA.id });
    }
  }

  public clear(): void {
    this.pokemons.clear();
    this.nextPokemonId = 1;
  }
}
