import { Pokemons } from '../../entities/Pokemons.js'
import { IPokemon } from '../dto/IPokemon.dto.js'
import { ISpriteType } from '../dto/ISpriteType.dto.js'

export class PokemonBuilder {
  private pokemonName: string | null = null
  private types: string[] | null = []
  private ability: string | null = null
  private heldItem: string | null = null
  private id: number | null = null
  private sprite: ISpriteType
  private timesCaught = 1

  setName(name: string) {
    this.pokemonName = name
    return this
  }

  setTypes(types: string[]) {
    this.types = types
    return this
  }

  setAbility(ability: string) {
    this.ability = ability
    return this
  }

  setHeldItem(item: string | null) {
    this.heldItem = item
    return this
  }

  setId(id: number) {
    this.id = id
    return this
  }

  setSprite(sprite: ISpriteType) {
    this.sprite = sprite
    return this
  }

  setTimesCaught(timesCaught: number) {
    this.timesCaught = timesCaught
    return this
  }

  build(): IPokemon {
    return {
      types: this.types,
      name: this.pokemonName,
      ability: this.ability,
      id: this.id,
      sprites: this.sprite,
      timesCaught: this.timesCaught,
    }
  }
}
