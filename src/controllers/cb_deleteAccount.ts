import mongo from '../db/Mongo'
import { ConversationCB, MainContext } from '../types'

export default async function cb_deleteAccount(
  conv: ConversationCB,
  ctx: MainContext
) {
  try {
    const newCtx = await conv.waitForCallbackQuery('delete')

    const user = await mongo.findOneUser(newCtx.from.username as string)
    if (!user)
      return await ctx.reply(
        `You're not registered in @${newCtx.me.username}. Use /register to use this bot`
      )

    // deletes user from all storages
    await mongo.deleteUser(user.userName)

    await ctx.api.deleteMessage(
      newCtx.chat?.id as number,
      newCtx.msgId as number
    )

    const msg = 'Your account has now been erased. Sad to see you go!'
    return await ctx.reply(msg)
  } catch (err) {
    throw err
  }
}
