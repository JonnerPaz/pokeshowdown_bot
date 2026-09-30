import type { PokemonEntity } from "./pokemon.entity.js";

export interface UserEntityProps {
  id: number | null;
  telegramId: number | bigint | null;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  pokemons: PokemonEntity[];
  pokeballs?: number;
  greatballs?: number;
  ultraballs?: number;
  masterballs?: number;
  lastDailyAt?: Date | null;
  dailyStreak?: number;
  wins?: number;
  losses?: number;
  buddyPokemonId?: number | null;
}

export class UserEntity {
  id: number | null = null;
  telegramId: number | bigint | null = null;
  username: string;
  readonly createdAt: Date;
  updatedAt: Date;

  // Use an array to store pokemon ids,
  // not the actual instance which will be stored in the database
  pokemons: PokemonEntity[];
  pokeballs: number;
  greatballs: number;
  ultraballs: number;
  masterballs: number;
  lastDailyAt: Date | null;
  dailyStreak: number;
  wins: number;
  losses: number;
  buddyPokemonId: number | null;

  constructor(props: UserEntityProps) {
    const {
      id = null,
      telegramId = null,
      username,
      createdAt = new Date(),
      updatedAt,
      pokemons,
      pokeballs = 10,
      greatballs = 2,
      ultraballs = 0,
      masterballs = 0,
      lastDailyAt = null,
      dailyStreak = 0,
      wins = 0,
      losses = 0,
      buddyPokemonId = null,
    } = props;
    this.id = id;
    this.telegramId = telegramId;
    this.username = username;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.pokemons = pokemons;
    this.pokeballs = pokeballs;
    this.greatballs = greatballs;
    this.ultraballs = ultraballs;
    this.masterballs = masterballs;
    this.lastDailyAt = lastDailyAt;
    this.dailyStreak = dailyStreak;
    this.wins = wins;
    this.losses = losses;
    this.buddyPokemonId = buddyPokemonId;
  }

  public get party(): PokemonEntity[] {
    return this.pokemons.filter((p) => p.isInParty);
  }

  public get box(): PokemonEntity[] {
    return this.pokemons.filter((p) => !p.isInParty);
  }
}
