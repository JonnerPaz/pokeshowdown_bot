import { CommandContext, Context } from 'grammy'
import { User } from './User'

export const findUser = function (
  user: CommandContext<Context>,
  dataBase: User[]
): User {
  return <User>dataBase.find((el) => el.userName === user.from?.username)
}

export const createInlineKeyboard = function () {}
