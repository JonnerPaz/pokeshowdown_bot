import { InputMediaPhoto } from 'grammy/types'
import { MainContext } from '../types'
import { InlineKeyboard } from 'grammy'

/**
 *
 * Send a message to someone at his private chat
 *
 */
export default async function uSendPrivate(
  ctx: MainContext,
  msg: string,
  inline_keyboard?: InlineKeyboard,
  media?: InputMediaPhoto[]
) {
  const user = await ctx.getAuthor()
  if (media && inline_keyboard) {
    await ctx.api.sendMediaGroup(user.user.id, media)
    await ctx.api.sendMessage(user.user.id, msg, {
      reply_markup: inline_keyboard,
    })
  } else if (media) {
    await ctx.api.sendMediaGroup(user.user.id, media)
    return await ctx.api.sendMessage(user.user.id, msg)
  } else if (inline_keyboard) {
    return await ctx.api.sendMessage(user.user.id, msg, {
      reply_markup: inline_keyboard,
    })
  } else {
    return await ctx.api.sendMessage(user.user.id, msg)
  }
}
