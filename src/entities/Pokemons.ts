import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  Relation,
} from 'typeorm'
import { Users } from './Users.js'
import { Sprites } from './Sprites.js'

@Entity('pokemons')
export class Pokemons {
  @PrimaryGeneratedColumn()
  id: number

  @Column('text')
  name: string

  @Column('simple-array')
  types: string[]

  @Column('text')
  ability: string

  // how many times this pokemon has been caught
  @Column({ type: 'int', default: 1 })
  timesCaught: number

  @OneToMany(() => Sprites, (sprite) => sprite.pokemon, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  sprites: Relation<Sprites[]>

  // cascades are used on the many side
  @ManyToOne(() => Users, (user) => user.pokemons, { onDelete: 'CASCADE' })
  user: Relation<Users>
}
