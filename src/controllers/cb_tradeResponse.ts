import { InputMediaBuilder } from 'grammy'
import mongo from '../db/Mongo'
import { ConversationCB, UserRegistered } from '../types'
import uSendPrivate from '../utils/uSendPrivate'

export default async function cb_tradeResponse(conv: ConversationCB) {
  try {
    const ctx = await conv.waitForCallbackQuery('tradeRequest')
    await ctx.api.deleteMessage(ctx.chat?.id as number, ctx.msgId as number)

    const userReq = await mongo.findOneUser(
      ctx.callbackQuery.message?.text?.split(' ').at(1)?.slice(1) as string
    )
    const userRes = await mongo.findOneUser(
      ctx.callbackQuery.from.username as string
    )

    if (userReq?.userName === userRes?.userName) {
      return await ctx.reply(`You can't trade with yourself`)
    }

    if (!userReq || !userRes) {
      const errMsg = `Error: One of the users are not registered. Blame: user1: ${
        ctx.callbackQuery.message?.text?.split(' ').at(1)?.slice(1) as string
      } or user2: ${ctx.callbackQuery.from.username as string}`
      ctx.reply(errMsg)
      throw Error(errMsg)
    }

    const users: UserRegistered[] = [userReq, userRes]
    for (const user of users) {
      const pokemonImages = user.pokemonParty.map((poke) =>
        InputMediaBuilder.photo(poke.sprite.frontDefault)
      )

      const msg = `Select pokemon to transfer (Beware: Once selected, there is no turning back)`
      await uSendPrivate(ctx, user.tlgID, msg, pokemonImages)
    }
  } catch (error) {
    throw error
  }
}
