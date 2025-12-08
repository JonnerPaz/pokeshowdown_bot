import { AppContext } from '../shared/types'
import { Command } from '@grammyjs/commands'
import { Bot } from 'grammy'
import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { BaseCommandController } from '../shared/classes/BaseCommandController.js'

export class LoginController<
  T extends AppContext,
> extends BaseCommandController<T> {
  constructor(bot: Bot<T>) {
    super(bot)
  }

  @addCommand
  public async start(): Promise<Command<T>> {
    const msg =
      'Welcome to PokeBotShowdown. This is a bot for pokemon battle and trade. For more information, type /help'

    const handler = async (ctx: T) => {
      await ctx.reply(msg)
    }

    return this.cmdHandler('START', handler)
  }

  @addCommand
  public async register() {
    const handler = async (ctx: T) => {
      try {
        const logoutController = this.registry.get('logout')
        if (!logoutController) {
          throw new Error('Logout controller not set')
        }

        await ctx.conversation.enter('register')
        await ctx.setMyCommands(logoutController)
        // await ctx.reply('Registered')
      } catch (error) {
        console.error(error)
        ctx.reply('There was an error during request. Please report it')
      }
    }
    return await this.cmdHandler('REGISTER', async (ctx: T) => {
      return await handler(ctx)
    })
  }
}
