import {
  PrimaryGeneratedColumn,
  Column,
  Entity,
  ManyToOne,
  Relation,
} from "typeorm";
import { Pokemons } from "./Pokemons.js";

@Entity("sprites")
export class Sprites {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("text")
  frontDefault: string;

  @Column("text")
  frontShiny: string;

  @Column("text")
  backDefault: string;

  @Column("text")
  backShiny: string;

  @ManyToOne(() => Pokemons, (pokemon) => pokemon.sprites)
  pokemon: Relation<Pokemons>;
}
