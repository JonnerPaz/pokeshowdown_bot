import { InputMediaBuilder } from 'grammy'
import mongo from '../../db/Mongo'
import { ConversationCB, UserRegistered } from '../../types'
import startTrade from './startTrade'

export default async function cb_tradeResponse(conv: ConversationCB) {
  try {
    const ctx = await conv.waitForCallbackQuery('tradeRequest')
    await ctx.deleteMessages([ctx.session.messageToDelete])
    ctx.session.messageToDelete = 0

    const userReq = await mongo.findOneUser(
      ctx.callbackQuery.message?.text?.split(' ').at(1)?.slice(1) as string
    )
    const userRes = await mongo.findOneUser(
      ctx.callbackQuery.from.username as string
    )

    /* if (userReq?.userName === userRes?.userName) {
      return await ctx.reply(`You can't trade with yourself`)
    } */

    if (!userReq || !userRes) {
      const errMsg = 'One of the users are not registered. Process Cancelled'
      await ctx.reply(errMsg)
      throw Error(errMsg)
    }
    const users: UserRegistered[] = [userReq, userRes]

    return await startTrade(conv, ctx, users)
  } catch (error) {
    throw error
  }
}
