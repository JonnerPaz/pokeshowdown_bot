import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Relation,
} from "typeorm";
import { Users } from "./Users.js";
import { Sprites } from "./Sprites.js";

@Entity("pokemons")
export class Pokemons {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column("text")
  name: string;

  @Column("simple-array")
  types: string[];

  @Column("text")
  ability: string;

  // how many times this pokemon has been caught
  @Column({ type: "int", default: 1 })
  timesCaught: number;

  @ManyToOne(() => Users, (user) => user.pokeparty)
  user: Relation<Users>;

  @OneToMany(() => Sprites, (sprite) => sprite.pokemon)
  sprites: Relation<Sprites>;
}
