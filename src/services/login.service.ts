import { InlineKeyboard } from 'grammy'
import { Conversation } from '@grammyjs/conversations'
import { AppContext } from '../shared/types'
import { UsersService } from './users.service.js'
import { getService } from '../shared/decorators/injectable.decorator.js'
import { addConversation } from '../shared/decorators/addConversation.decorator.js'

export class LoginService {
  constructor() {}

  @addConversation
  public async register(conv: Conversation, ctx: AppContext) {
    try {
      await ctx.reply('Welcome to ShowdownBot')
      await ctx.reply("If you're a new user, please just type yes to register")
      const userCtx = getService(UsersService) as UsersService
      const {
        from: { username },
      } = await conv.waitFor('message:text')

      const user = await userCtx.findOneUser(username)
      if (user) {
        await ctx.reply('You are already registered!')
        return
      }

      await userCtx.addUser({ username })
      await ctx.reply('You are now registered!')
    } catch (error) {
      ctx.reply('There was an error during request. Please report it')
      throw error
    }
  }

  @addConversation
  public async deleteAccount(conv: Conversation, ctx: AppContext) {
    try {
      const userCtx = getService(UsersService) as UsersService
      const username = ctx.from?.username
      const isUserRegistered = await userCtx.findOneUser(username)

      const choice = new InlineKeyboard()
        .text('Yes', 'delete-account')
        .text('No', 'no')

      if (!isUserRegistered) {
        await ctx.reply('You are not registered!')
        return
      }

      await ctx.reply('Are you sure you want to delete your account?', {
        reply_markup: choice,
      })
    } catch (err) {
      console.log(err)
      throw err
    }
  }
}
