import { CommandsGroupContext } from '../shared/types'
import { Command, LanguageCodes } from '@grammyjs/commands'
import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { BaseCommandController } from '../shared/classes/BaseCommandController.js'
import { getCommand, getDescription } from '../shared/commands.js'
import { controller as logoutController } from './logout.controller.js'

export class LoginController<
  T extends CommandsGroupContext,
> extends BaseCommandController<T> {
  @addCommand
  public startBot(): Command<T> {
    const msg =
      'Welcome to PokeBotShowdown. This is a bot for pokemon battle and trade. For more information, type /help'
    return super
      .command(
        getCommand('START'),
        getDescription('START'),
        async (ctx) => await ctx.reply(msg)
      )
      .addToScope({ type: 'all_group_chats' })
      .localize(
        LanguageCodes.Spanish,
        getCommand('START', LanguageCodes.Spanish),
        getDescription('START', LanguageCodes.Spanish)
      )
  }

  @addCommand
  public register() {
    return super.command(
      getCommand('REGISTER'),
      getDescription('REGISTER'),
      async (ctx) => {
        console.log('MY LOGOUT', logoutController)
        await ctx.reply('Registered')
        await ctx.setMyCommands(logoutController)
      }
    )
  }
}

const controller = new LoginController()
export { controller }
