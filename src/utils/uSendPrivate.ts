import { grammyContext } from '../types'

export default async function uSendPrivate(
  ctx: grammyContext,
  msg: string,
  media?: any
) {
  return await ctx
    .getAuthor()
    .then((user) =>
      media
        ? ctx.api.sendMessage(user.user.id, msg, { reply_markup: media })
        : ctx.api.sendMessage(user.user.id, msg)
    )
}
