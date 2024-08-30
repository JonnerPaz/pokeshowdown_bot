import { InlineKeyboard } from 'grammy'
import { PokemonRegistered } from '../types'
import { InlineKeyboardButton } from '@grammyjs/types'

/**
 * Creates a button with the pokemon you passed in
 *
 * @param pokemonNames - Pokemon object
 */
export default function createInlineKeyboard(
  pokemonNames: PokemonRegistered
): InlineKeyboard

/**
 * Creates a button with the collection you passed in
 *
 * @param pokemonNames - must receive null if you want to use a collection
 * @param pokemonCollection - Array of PokemonRegistered
 */
export default function createInlineKeyboard(
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
export default function createInlineKeyboard(
  pokemonNames: null,
  pokemonCollection: null,
  buttons: InlineKeyboardButton[][]
): InlineKeyboard

export default function createInlineKeyboard(
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
    const buttonRow = pokemonCollection.map((el, i) => {
      return InlineKeyboard.text(el.name, `${el.name}_choice${i}`)
    })
    return InlineKeyboard.from([buttonRow]).toFlowed(3)
  }

  if (!pokemonNames) return null

  return new InlineKeyboard().text(pokemonNames.name, 'choice0')
}
