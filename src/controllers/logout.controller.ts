import { BaseCommandController } from '../shared/classes/BaseCommandController.js'
import { AppContext } from '../shared/types.js'
import { Command } from '@grammyjs/commands'
import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { Bot } from 'grammy'
import { RegisterConvService } from '../services/registerConversation.service.js'
import { Inject } from '../shared/decorators/injectable.decorator.js'

export class LogoutController<
  T extends AppContext,
> extends BaseCommandController<T> {
  @Inject()
  private conversationService: RegisterConvService

  constructor(public bot: Bot<T>) {
    super(bot)
  }

  @addCommand
  public async logout(): Promise<Command<T>> {
    const handler = async (ctx: T) => {
      try {
        const loginController = this.registry.get('login')
        if (!loginController) {
          throw new Error('Login controller not set')
        }
        await ctx.setMyCommands(loginController)
        await ctx.reply('Bye')
      } catch (error) {
        console.error(error)
        ctx.reply('There was an error during request. Please report it')
      }
    }

    return await this.cmdHandler('LOGOUT', handler)
  }

  @addCommand
  public async register() {
    const handler = async (ctx: T) => {
      try {
        const loginController = this.registry.get('login')
        if (!loginController) {
          throw new Error('Login controller not set')
        }
        await ctx.setMyCommands(loginController)
        await ctx.reply('Registered')
      } catch (error) {
        console.error(error)
        ctx.reply('There was an error during request. Please report it')
      }
    }
    return await this.cmdHandler('REGISTER', handler)
  }
}
