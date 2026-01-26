import { PokemonEntity } from "../../entities/pokemon.entity.js";

interface UpdateUserDtoProps {
  id: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  pokemons: PokemonEntity[];
}

export class UpdateUserDto {
  id: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  pokemons: PokemonEntity[] = [];

  private constructor(props: UpdateUserDtoProps) {
    this.id = props.id;
    this.username = props.username;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.pokemons = props.pokemons;
  }

  static fromObject(props: UpdateUserDto): UpdateUserDto {
    const { id, username, createdAt, updatedAt, pokemons } = props;
    if (!id) throw new Error("Id is required");
    if (!username) throw new Error("Username is required");
    if (!createdAt) throw new Error("CreatedAt is required");
    if (!updatedAt) throw new Error("UpdatedAt is required");
    if (!pokemons) throw new Error("Pokemons are required");

    return new UpdateUserDto({
      id,
      username,
      createdAt,
      updatedAt,
      pokemons,
    });
  }
}
