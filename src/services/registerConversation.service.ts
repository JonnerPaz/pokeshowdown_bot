import { AppContext } from '../shared/types'
import { Conversation } from '@grammyjs/conversations'
import { UsersService } from './users.service.js'
import { getService } from '../shared/decorators/injectable.decorator.js'
import { addConversation } from '../shared/decorators/addConversation.decorator.js'

export class RegisterConvService {
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
      return
    } catch (error) {
      ctx.reply('There was an error during request. Please report it')
      throw error
    }
  }

  public async init() {
    try {
      if (!(this.constructor as any)._conversations) {
        throw new Error(`Error: No methods found in ${this.constructor.name}`)
      }
      const methodNames: string[] = Array.from(
        (this.constructor as any)._conversations
      )
      const methods = methodNames.map((key) => (this as any)[key])
      return methods
    } catch (err) {
      console.error(err)
    }
  }
}
