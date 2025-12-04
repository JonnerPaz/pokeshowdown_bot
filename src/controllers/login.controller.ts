import { AppContext } from '../shared/types'
import { Command, LanguageCodes } from '@grammyjs/commands'
import { Bot } from 'grammy'
import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { BaseCommandController } from '../shared/classes/BaseCommandController.js'
import { getCommandInfo } from '../shared/commands.js'

export class LoginController<
  T extends AppContext,
> extends BaseCommandController<T> {
  constructor(bot: Bot<T>) {
    super(bot)
  }

  @addCommand
  public start(): Command<T> {
    const msg =
      'Welcome to PokeBotShowdown. This is a bot for pokemon battle and trade. For more information, type /help'

    const handler = async (ctx: T) => {
      await ctx.reply(msg)
    }

    const { command, description } = getCommandInfo('START')
    const { command: commandSpa, description: descriptionSpa } = getCommandInfo(
      'START',
      LanguageCodes.Spanish
    )
    return super
      .command(command, description, async (ctx) => ctx.reply(msg))
      .addToScope({ type: 'all_group_chats' })
      .localize(LanguageCodes.Spanish, commandSpa, descriptionSpa)
  }

  @addCommand
  public register() {
    const handler = async (ctx: T) => {
      try {
        const logoutController = this.registry.get('logout')
        if (!logoutController) {
          throw new Error('Logout controller not set')
        }
        await ctx.setMyCommands(logoutController)
        await ctx.reply('Registered')
      } catch (error) {
        console.error(error)
        ctx.reply('There was an error during request. Please report it')
      }
    }
    return this.cmdHandler('REGISTER', handler)
  }
}
