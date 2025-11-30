import mongo from '../../db/Mongo'
import { ConversationCB, MainContext } from '../../types'

export default async function deleteAccount(
  conv: ConversationCB,
  ctx: MainContext
) {
  try {
    const user = await mongo.findOneUser(ctx.from?.username as string)
    if (!user)
      return await ctx.reply(
        `You're not registered in @${ctx.me.username}. Use /register to use this bot`
      )

    await mongo.deleteUser(user.userName)

    await ctx.api.deleteMessage(ctx.chat?.id as number, ctx.msgId as number)

    const msg = 'Your account has now been erased. Sad to see you go!'
    return await ctx.reply(msg)
  } catch (err) {
    throw err
  }
}
