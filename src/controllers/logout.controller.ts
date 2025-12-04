import { BaseCommandController } from '../shared/classes/BaseCommandController.js'
import { getCommand, getDescription } from '../shared/commands.js'
import { AppContext } from '../shared/types.js'
import { Command } from '@grammyjs/commands'
import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { Bot } from 'grammy'
import { LoginController } from './login.controller.js'

export class LogoutController<
  T extends AppContext,
> extends BaseCommandController<T> {
  constructor(public bot: Bot<T>) {
    super(bot)
  }

  @addCommand
  public logout(): Command<T> {
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

    return this.cmdHandler('LOGOUT', handler)
  }

  public async register() {
    return super.command(
      getCommand('LOGOUT'),
      getDescription('LOGOUT'),
      async function (ctx) {
        return await ctx.reply('Bye!!!')
      }
    )
  }
}
