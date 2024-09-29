import { InlineKeyboard } from 'grammy'
import { MainContext } from '../types'

export default async function deleteAccount(ctx: MainContext) {
  try {
    const inlnKeyboard = new InlineKeyboard()
      .text('YES', 'delete')
      .text('NO', 'cancel')

    await ctx.reply(
      `@${ctx.from?.username} type "yes" if you want to delete your account`
    )
    await ctx.reply('Delete your account (including all of your data)?', {
      reply_markup: inlnKeyboard,
    })

    return await ctx.conversation.enter('cb_deleteAccount')
  } catch (err) {
    await ctx.reply(
      'Error while deleting yout account. Contact the author of this plugin for issues'
    )
    throw err
  }
}
