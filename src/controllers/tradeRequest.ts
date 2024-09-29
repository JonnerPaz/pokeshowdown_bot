import { CommandContext, Context, InlineKeyboard } from 'grammy'
import mongo from '../db/Mongo'

export default async function tradeRequest(ctx: CommandContext<Context>) {
  try {
    const user = await mongo.findOneUser(ctx.from?.username as string)
    console.log(user)
    if (!user) throw Error('No user')

    const keyboard = new InlineKeyboard()
      .text('Trade!', 'tradeRequest')
      .text('cancel', 'cancel')

    await ctx.reply(
      `User ${user.userName} wants to start a trade! trade with him`,
      {
        reply_markup: keyboard,
      }
    )
  } catch (error) {
    console.error(error)
  }
}
