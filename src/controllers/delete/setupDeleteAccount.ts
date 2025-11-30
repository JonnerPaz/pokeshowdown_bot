import { InlineKeyboard } from 'grammy'
import { ConversationCB, MainContext } from '../../types'
import deleteAccount from './deleteAccount'

export default async function setupDeleteAccount(
  conv: ConversationCB,
  ctx: MainContext
) {
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

    const userCtx = await conv.waitFrom(ctx.from?.id as number)
    return await deleteAccount(conv, userCtx)
  } catch (err) {
    await ctx.reply(
      'Error while deleting yout account. Contact the author of this plugin for issues'
    )
    throw err
  }
}
