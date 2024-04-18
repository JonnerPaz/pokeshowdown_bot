import { SpriteType, PokemonRegistered } from './types'

export class PokemonBuilder {
  private pokemonName: string | null = null
  private ability: string | null = null
  private heldItem: string | null = null
  private id: number | null = null
  private sprite: SpriteType | null = null

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
    }
  }
}
