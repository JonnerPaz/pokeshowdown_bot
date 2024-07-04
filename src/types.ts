import {
  CallbackQueryContext,
  CommandContext,
  Context,
  InlineKeyboard,
} from 'grammy'
import { User } from './classes/User'
import { Document, MongoClient, WithId } from 'mongodb'
import mongo from './db/Mongo'

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

export type userFound = WithId<Document> | UserRegistered

export type MongoType = typeof mongo
