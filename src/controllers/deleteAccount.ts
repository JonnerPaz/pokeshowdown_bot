import { CommandContext, Context, InlineKeyboard } from 'grammy'
import mongo from '../db/Mongo'

export default async function deleteAccount(ctx: CommandContext<Context>) {
  try {
    const user = await mongo.findOneUser(ctx.msg.from?.username as string)

    if (!user)
      throw Error(
        `You're not registered in @${ctx.me.username}. Use /register to use this bot`
      )

    const inlnKeyboard = new InlineKeyboard()
      .text('YES', 'delete')
      .text('NO', 'cancel')

    await ctx.reply(
      `@${ctx.from?.username} type "yes" if you want to delete your account`
    )
    await ctx.reply('Delete your account (including all of your data)?', {
      reply_markup: inlnKeyboard,
    })
  } catch (err) {
    await ctx.reply(err as string)
    throw err
  }
}
