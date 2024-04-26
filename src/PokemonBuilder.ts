import { SpriteType, PokemonRegistered } from './types'

// TODO: Ad counter property to know the quantity of pokemon captured
// if you capture certain amount, they can evolve
export class PokemonBuilder {
  private pokemonName: string | null = null
  private ability: string | null = null
  private heldItem: string | null = null
  private id: number | null = null
  private sprite: SpriteType | null = null
  private counter = 0

  setName(name: string) {
    this.pokemonName = name
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

  setSprite(sprite: SpriteType) {
    this.sprite = sprite
    return this
  }

  build(): PokemonRegistered {
    return {
      name: this.pokemonName as string,
      ability: this.ability as string,
      id: this.id as number,
      sprite: this.sprite as SpriteType,
      heldItem: this.heldItem as string,
      counter: this.counter,
    }
  }
}
