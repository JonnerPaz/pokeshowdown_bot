import { InlineKeyboard, InputMediaBuilder } from 'grammy'
import { User } from '../classes/User'
import { PokemonRegistered, grammyContext } from '../types'
import { InlineKeyboardButton } from '@grammyjs/types'

/**
 * Creates a button with the pokemon you passed in
 *
 * @param pokemonNames - Pokemon object
 */
export function createInlineKeyboard(
  pokemonNames: PokemonRegistered
): InlineKeyboard

/**
 * Creates a button with the collection you passed in
 *
 * @param pokemonNames - must receive null if you want to use a collection
 * @param pokemonCollection - Array of PokemonRegistered
 */
export function createInlineKeyboard(
  pokemonNames: null,
  pokemonCollection: PokemonRegistered[]
): InlineKeyboard

/**
 * Creates a button with the specified buttons you passed in
 *
 * @param pokemonNames Must receive null
 * @param pokemonCollection Must receive null
 * @param buttons Receives InlineKeyboardButton[][]
 */
export function createInlineKeyboard(
  pokemonNames: null,
  pokemonCollection: null,
  buttons: InlineKeyboardButton[][]
): InlineKeyboard

export function createInlineKeyboard(
  pokemonNames: PokemonRegistered | null,
  pokemonCollection?: PokemonRegistered[] | null,
  buttons?: InlineKeyboardButton[][]
): InlineKeyboard | null {
  if (buttons) {
    const newButtons = [...buttons].flat().map((el, i) => {
      return InlineKeyboard.text(el.text, `choice${i}`)
    })
    return InlineKeyboard.from([newButtons])
  }

  if (Array.isArray(pokemonCollection)) {
    // creates a 2 dimensional arr full of strings, labeled as "value, data"
    const buttonRow = [...pokemonCollection].map((el, i) => {
      return InlineKeyboard.text(el.name, `${el.name} choice${i}`)
    })
    return InlineKeyboard.from([buttonRow]).toFlowed(3)
  }

  if (!pokemonNames) return null

  return new InlineKeyboard().text(pokemonNames.name, 'choice0')
}

/**
 * Verifies if given variable is typeof PokemonRegistered
 */
export const isPokemonRegistered = (
  pokemon: PokemonRegistered | null
): pokemon is PokemonRegistered => {
  return (pokemon as PokemonRegistered).name !== null
}

/**
 *
 * Creates a custom keyboard to use in telegram
 *
 * @param user - a User instance
 * @param ctx - the exact ctx obj received from any grammy command
 */
export async function customInlnKbdBtn(
  user: User,
  ctx: grammyContext
): Promise<InlineKeyboard> {
  const userPokemonPhotos = [...user.pokemonParty].map((pokemon) =>
    InputMediaBuilder.photo(pokemon.sprite.frontDefault)
  )
  const inlineKeyboard = createInlineKeyboard(null, user.pokemonParty).text(
    'cancel',
    'cancel' // exits this code and goes to cancel query
  )
  if (typeof ctx.chat?.id === 'number') {
    await ctx.api.sendMediaGroup(ctx.chat?.id, userPokemonPhotos)
  }
  return inlineKeyboard
}
