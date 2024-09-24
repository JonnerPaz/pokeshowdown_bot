import { CallbackQueryContext, Context } from 'grammy'
import mongo from '../db/Mongo'

export default async function cb_deleteAccount(
  ctx: CallbackQueryContext<Context>
) {
  try {
    ctx.deleteMessages([ctx.msg?.message_id as number])

    const user = await mongo.findOneUser(ctx.from.username as string)
    if (!user) return await ctx.reply('there is no user')

    // deletes user from all storages
    await mongo.deleteUser(user.userName)

    const msg = 'Your account has now been erased. Sad to see you go!'
    return await ctx.reply(msg)
  } catch (err) {
    throw err
  }
}
