import { grammyContext } from '../types'

export default async function uSendPrivate(
  ctx: grammyContext,
  msg: string,
  media?: any
) {
  const user = await ctx.getAuthor()
  if (media) {
    return await ctx.api.sendMessage(user.user.id, msg, { reply_markup: media })
  }

  return await ctx.api.sendMessage(user.user.id, msg)
}
