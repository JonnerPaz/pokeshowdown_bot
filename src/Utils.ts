import {
  InlineKeyboard,
  CommandContext,
  Context,
  CallbackQueryContext,
} from 'grammy'
import { User } from './User'
import { PokemonRegistered } from './types'

export const findUser = function (
  ctx: CommandContext<Context> | CallbackQueryContext<Context>,
  dataBase: User[]
): User {
  return <User>dataBase.find((el) => el.userName === ctx.from?.username)
}

/**
 * @param pokemonNames {string[] | string} must receive pokemon names
 */
export const createInlineKeyboard = (
  pokemonNames: PokemonRegistered[] | PokemonRegistered
): InlineKeyboard => {
  if (Array.isArray(pokemonNames)) {
    // creates a 2 dimensional arr full of strings, labeled as "value, data"
    const buttonRow = [...pokemonNames]
      .map((el, i): string[] => {
        return [el.name, 'choice' + String(i)]
      })
      .map(([label, data]) => {
        return InlineKeyboard.text(label, data)
      })
    return InlineKeyboard.from([buttonRow])
  }

  const keyboard = new InlineKeyboard().text(String(pokemonNames), String(0))
  return keyboard
}
