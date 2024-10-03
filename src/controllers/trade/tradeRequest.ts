import { InlineKeyboard } from 'grammy'
import mongo from '../../db/Mongo'
import { MainContext } from '../../types'

export default async function tradeRequest(ctx: MainContext) {
  try {
    const user = await mongo.findOneUser(ctx.from?.username as string)
    if (!user) return await ctx.reply('No user found!')

    const keyboard = new InlineKeyboard()
      // tradeRequest starts cb_tradeResponse
      .text('Trade!', 'tradeRequest')
      .text('cancel', 'cancel')

    const msg = await ctx.reply(
      `User @${user.userName} wants to start a trade! Who would like to start a trade with him?`,
      {
        reply_markup: keyboard,
      }
    )
    ctx.session.messageToDelete = msg.message_id

    await ctx.conversation.enter('cb_tradeResponse')
  } catch (error) {
    console.error(error)
  }
}
