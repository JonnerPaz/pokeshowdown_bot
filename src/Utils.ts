import {
  InlineKeyboard,
  CommandContext,
  Context,
  CallbackQueryContext,
} from 'grammy'
import { User } from './User'

export const findUser = function (
  ctx: CommandContext<Context> | CallbackQueryContext<Context>,
  dataBase: User[]
): User {
  return <User>dataBase.find((el) => el.userName === ctx.from?.username)
}

/**
 * @param pokemonNames {string[] | string} must receive pokemon names
 */
export const createInlineKeyboard = (pokemonNames: string[] | string) => {
  if (Array.isArray(pokemonNames)) {
    // pushes a 2 dimensional arr that could be full of numbers and strings
    const option = [...pokemonNames]
    const buttonRow = option.map(([label, data]) =>
      InlineKeyboard.text(label, data)
    )
    const keyboard = InlineKeyboard.from([buttonRow])
    return keyboard
  }

  const keyboard = new InlineKeyboard().text(pokemonNames, String(0))
  return keyboard
}
