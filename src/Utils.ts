import { InlineKeyboard, InputMediaBuilder } from 'grammy'
import { User } from './User'
import { PokemonRegistered, grammyContext } from './types'
import { InlineKeyboardButton } from '@grammyjs/types'

/**
 * @param pokemonNames {string[] | string} must receive pokemon names
 * @param buttons {InlineKeyboardButton[][]} if using this, send null to pokemonNames
 */
// TODO: need a refactor
export const createInlineKeyboard = (
  pokemonNames: PokemonRegistered[] | PokemonRegistered | null,
  buttons?: InlineKeyboardButton[][]
): InlineKeyboard => {
  if (buttons) {
    const newButtons = [...buttons].flat().map((el, i) => {
      return InlineKeyboard.text(el.text, 'choice' + String(i))
    })
    return InlineKeyboard.from([newButtons])
  }

  if (Array.isArray(pokemonNames)) {
    // creates a 2 dimensional arr full of strings, labeled as "value, data"
    const buttonRow = [...pokemonNames].map((el, i) => {
      return InlineKeyboard.text(el.name, `${el.name} choice${i}`)
    })
    return InlineKeyboard.from([buttonRow])
  }

  if (pokemonNames !== null) {
    const keyboard = new InlineKeyboard().text(pokemonNames.name, 'choice0')
    return keyboard
  }

  // fallback that should never be entered
  return new InlineKeyboard().text('empty')
}

/**
 *
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
 * @param user - a User() instance
 * @param ctx - the exact ctx obj received from any grammy command
 */
export const customInlnKbdBtn = async (
  user: User,
  ctx: grammyContext
): Promise<InlineKeyboard> => {
  const userPokemonPhotos = [...user.pokemonParty].map((pokemon) =>
    InputMediaBuilder.photo(pokemon.sprite.frontDefault)
  )
  const inlineKeyboard = createInlineKeyboard(user.pokemonParty).text(
    'cancel',
    'cancel' // exits this code and goes to cancel query
  )
  if (typeof ctx.chat?.id === 'number') {
    await ctx.api.sendMediaGroup(ctx.chat?.id, userPokemonPhotos)
  }
  return inlineKeyboard
}
