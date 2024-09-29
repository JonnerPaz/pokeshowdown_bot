import { InputMediaPhoto } from 'grammy/types'
import { grammyContext } from '../types'
import { InlineKeyboard } from 'grammy'

export default async function uSendPrivate(
  ctx: grammyContext,
  byUserId: number,
  msg: string,
  media?: InputMediaPhoto[] | InlineKeyboard
) {
  if (Array.isArray(media)) {
    await ctx.reply(msg)
    return await ctx.api.sendMediaGroup(byUserId, media)
  }

  if (media instanceof InlineKeyboard) {
    return await ctx.api.sendMessage(byUserId, msg, { reply_markup: media })
  }

  return await ctx.api.sendMessage(byUserId, msg)
}
