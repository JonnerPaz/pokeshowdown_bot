import { InlineKeyboard } from 'grammy'

export interface SpriteType {
  frontDefault: string
  frontDefaultAlt: string
  frontShiny: string
  backDefault: string
  backShiny: string
}

export interface PokemonRegistered {
  id: number
  sprite: SpriteType
  name: string
  ability: string
  heldItem: string
}

export type PokemonKeyboard = {
  (pokemon: PokemonRegistered[]): InlineKeyboard
  (pokemon: PokemonRegistered): InlineKeyboard
}
