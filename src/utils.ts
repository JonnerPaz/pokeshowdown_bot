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

export const createCatchInlineKeyboard = function (
  options: number,
  name: string[]
) {
  const inlnKeyboard = new InlineKeyboard()
}
