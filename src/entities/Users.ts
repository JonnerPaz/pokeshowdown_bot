import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Relation,
} from "typeorm";
import { Pokemons } from "./Pokemons.js";

@Entity({ name: "users" })
export class Users {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20, unique: true })
  username: string;

  @OneToMany(() => Pokemons, (pokemon) => pokemon.user, {
    cascade: true,
    nullable: true,
  })
  pokeparty?: Relation<Pokemons[]>;
}
