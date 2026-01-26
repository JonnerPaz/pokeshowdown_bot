export interface UserEntityProps {
  id: number;
  username: string;
  createdAt: Date;
  updatedAt: Date;
  pokemonIds: number[];
}

export class UserEntity {
  id: number;
  username: string;
  readonly createdAt: Date;
  updatedAt: Date;

  // Use an array to store pokemon ids,
  // not the actual instance which will be stored in the database
  pokemonIds: number[];

  constructor(props: UserEntityProps) {
    const {
      id,
      username,
      createdAt = new Date(),
      updatedAt,
      pokemonIds,
    } = props;
    this.id = id;
    this.username = username;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.pokemonIds = pokemonIds;
  }
}
