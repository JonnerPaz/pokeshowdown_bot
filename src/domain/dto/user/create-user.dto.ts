import { PokemonEntity } from "../../entities/pokemon.entity.js";

interface CreateUserDtoProps {
  username: string;
  createdAt: Date;
  updatedAt: Date;
  pokemons: PokemonEntity[];
}

export class CreateUserDto {
  username: string;
  createdAt: Date;
  updatedAt: Date;

  pokemons: PokemonEntity[] = [];

  private constructor({
    username,
    createdAt,
    updatedAt,
    pokemons,
  }: CreateUserDtoProps) {
    this.username = username;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.pokemons = pokemons;
  }

  static fromObject(props: CreateUserDto): CreateUserDto {
    const { username, createdAt, updatedAt, pokemons } = props;
    if (!username) throw new Error("Username is required");
    if (!createdAt) throw new Error("CreatedAt is required");
    if (!updatedAt) throw new Error("UpdatedAt is required");
    if (!pokemons) throw new Error("Pokemons are required");

    return new CreateUserDto({
      username,
      createdAt,
      updatedAt,
      pokemons,
    });
  }
}
