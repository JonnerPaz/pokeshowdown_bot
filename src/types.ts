import {
  CallbackQueryContext,
  CommandContext,
  Context,
  InlineKeyboard,
  SessionFlavor,
} from 'grammy'
import { User } from './classes/User'
import { Conversation, ConversationFlavor } from '@grammyjs/conversations'

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

export interface UserRegistered extends User {}

export type grammyContext =
  | CommandContext<Context>
  | CallbackQueryContext<Context>

// here goes all properties of a session
interface ISession {}

// necessary for session and conversations plugin to work
export type MainContext = Context & SessionFlavor<ISession> & ConversationFlavor

export type ConversationCB = Conversation<MainContext>
