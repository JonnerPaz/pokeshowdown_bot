import {
  InlineKeyboard,
  CommandContext,
  Context,
  CallbackQueryContext,
  InputMediaBuilder,
} from 'grammy'
import { User } from './User'
import { PokemonRegistered } from './types'
import { InlineKeyboardButton } from '@grammyjs/types'

export const findUser = function (
  ctx: CommandContext<Context> | CallbackQueryContext<Context>,
  dataBase: User[]
): User {
  return <User>dataBase.find((el) => el.userName === ctx.from?.username)
}

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
      return InlineKeyboard.text(el.name, 'choice' + String(i))
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

export const isPokemonRegistered = (
  pokemon: PokemonRegistered | null
): pokemon is PokemonRegistered => {
  return (pokemon as PokemonRegistered).name !== null
}

export const customInlnKbdBtn = async (
  user: User,
  ctx: CallbackQueryContext<Context>
): Promise<InlineKeyboard> => {
  const userPokemonPhotos = [...user.getPokemonSummary].map((pokemon) =>
    InputMediaBuilder.photo(pokemon.sprite.frontDefault)
  )
  const inlineKeyboard = createInlineKeyboard(user.data.pokemon).text(
    'cancel',
    'cancel' // exits this code and goes to cancel query
  )
  if (typeof ctx.chat?.id === 'number') {
    await ctx.api.sendMediaGroup(ctx.chat?.id, userPokemonPhotos)
  }
  return inlineKeyboard
}
