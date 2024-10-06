import { InlineKeyboard } from 'grammy'
import mongo from '../../db/Mongo'
import { ConversationCB, MainContext, UserRegistered } from '../../types'
import cb_tradeResponse from './cb_tradeResponse'
import startTrade from './startTrade'

export default async function tradeRequest(
  conv: ConversationCB,
  ctx: MainContext
) {
  try {
    const user = await mongo.findOneUser(ctx.from?.username as string)
    if (!user)
      return await ctx.reply(
        'No user found! sign up to the bot using /register'
      )

    const keyboard = new InlineKeyboard()
      .text('Trade!', 'tradeRequest')
      .text('cancel', 'cancel')

    const msg = await ctx.reply(
      `User @${user.userName} wants to start a trade! Who would like to start a trade with him?`,
      {
        reply_markup: keyboard,
      }
    )

    const userResCtx = await conv.waitForCallbackQuery('tradeRequest')

    if (userResCtx.from.username === ctx.from?.username) {
      await ctx.deleteMessages([msg.message_id])
      return await ctx.reply(
        `You can't trade with yourself. Process cancelled!`
      )
    }

    await ctx.deleteMessages([msg.message_id])

    // await cb_tradeResponse(conv, userCtx)

    const userReq = await mongo.findOneUser(
      userResCtx.callbackQuery.message?.text
        ?.split(' ')
        .at(1)
        ?.slice(1) as string
    )
    const userRes = await mongo.findOneUser(
      userResCtx.callbackQuery.from.username as string
    )

    if (!userReq || !userRes) {
      const errMsg = 'One of the users are not registered. Process Cancelled'
      return await ctx.reply(errMsg)
      // throw Error(errMsg)
    }

    ctx.session.userReqId = ctx.from?.id as number
    ctx.session.userResId = userResCtx.from.id
    const users: UserRegistered[] = [userReq, userRes]

    return await startTrade(conv, ctx, users)
  } catch (error) {
    console.error(error)
  }
}
