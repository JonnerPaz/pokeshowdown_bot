import { AppContext } from '../../shared/types.js'
import { Conversation } from '@grammyjs/conversations'
import { UsersService } from '../users.service.js'

export async function register(conv: Conversation, ctx: AppContext) {
  try {
    await ctx.reply('Welcome to ShowdownBot')
    await ctx.reply("If you're a new user, please just type yes to register")
    const { from } = await conv.waitFor('message:text')
    const userService = new UsersService()
    console.log(from)
    await conv.external(
      async () => await userService.addUser({ username: from.username })
    )

    await ctx.reply('You are now registered!')
  } catch (error) {
    throw error
  }
}
