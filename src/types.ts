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
export interface ISession {
  users: UserRegistered[]
  userCatch: User | null
  userCatchRequest: UserRegistered | null
  route: string
  triggerPokemonPartyFull: PokemonRegistered | null
  userParty: PokemonRegistered | null
}

// necessary for session and conversations plugin to work
export type MainContext = Context & SessionFlavor<ISession> & ConversationFlavor

export type CBQueryContext = CallbackQueryContext<MainContext> &
  SessionFlavor<ISession>

export type ConversationCB = Conversation<MainContext>
