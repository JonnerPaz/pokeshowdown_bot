import {
  CallbackQueryContext,
  CommandContext,
  Context,
  InlineKeyboard,
} from 'grammy'
import { User } from './User'

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
  counter: number
}

export type PokemonKeyboard = {
  (pokemon: PokemonRegistered[]): InlineKeyboard
  (pokemon: PokemonRegistered): InlineKeyboard
}

export type UserRegistered = User

export type grammyContext =
  | CommandContext<Context>
  | CallbackQueryContext<Context>
