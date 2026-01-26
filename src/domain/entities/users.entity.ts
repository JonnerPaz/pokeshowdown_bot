import type { PokemonEntity } from "./pokemon.entity.js";

export interface UserEntityProps {
  id: number | null;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  pokemons: PokemonEntity[];
}

export class UserEntity {
  id: number | null = null;
  username: string;
  readonly createdAt: Date;
  updatedAt: Date;

  // Use an array to store pokemon ids,
  // not the actual instance which will be stored in the database
  pokemons: PokemonEntity[];

  constructor(props: UserEntityProps) {
    const {
      id = null,
      username,
      createdAt = new Date(),
      updatedAt,
      pokemons,
    } = props;
    this.id = id;
    this.username = username;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.pokemons = pokemons;
  }
}
