import { User } from '@grammyjs/types'
import mongo from '../../db/Mongo'
import { ConversationCB, MainContext, UserRegistered } from '../../types'
import startTrade from './startTrade'
import { CallbackQueryContext } from 'grammy'

export default async function cb_tradeResponse(
  conv: ConversationCB,
  ctx: CallbackQueryContext<MainContext> & {
    from: User
  }
) {
  try {
    const userReq = await mongo.findOneUser(
      ctx.callbackQuery.message?.text?.split(' ').at(1)?.slice(1) as string
    )
    const userRes = await mongo.findOneUser(
      ctx.callbackQuery.from.username as string
    )

    if (!userReq || !userRes) {
      const errMsg = 'One of the users are not registered. Process Cancelled'
      return await ctx.reply(errMsg)
      // throw Error(errMsg)
    }
    const users: UserRegistered[] = [userReq, userRes]

    return await startTrade(conv, ctx, users)
  } catch (error) {
    throw error
  }
}
