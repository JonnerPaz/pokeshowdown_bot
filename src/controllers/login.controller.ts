import { AppContext } from '../shared/types'
import { Bot } from 'grammy'
import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { BaseCommandController } from '../shared/classes/BaseCommandController.js'
import { getAllCommands } from '../shared/commands.js'

export class LoginController<
  T extends AppContext,
> extends BaseCommandController<T> {
  constructor(bot: Bot<T>) {
    super(bot)
  }

  @addCommand
  public async start() {
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

        await ctx.setMyCommands(logoutController)
        await ctx.conversation.enter('register')
      } catch (error) {
        console.error(error)
        ctx.reply('There was an error during request. Please report it')
      }
    }

    return await this.cmdHandler(
      'REGISTER',
      async (ctx: T) => await handler(ctx)
    )
  }

  @addCommand
  public async help() {
    const handler = async (ctx: T) => {
      try {
        let msg = `List of commands of @${ctx.me.username}:\n`
        getAllCommands().forEach((command) => {
          msg += `/${command.command} - ${command.description}\n`
        })
        await ctx.reply(msg + '\nFor more information, type /start')
      } catch (error) {
        ctx.reply('There was an error during request. Please report it')
        console.error(error)
        throw error
      }
    }

    return await this.cmdHandler('HELP', async (ctx: T) => await handler(ctx))
  }
}
