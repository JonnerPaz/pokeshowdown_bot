import { BaseCommandController } from '../shared/classes/BaseCommandController.js'
import { getCommand, getDescription } from '../shared/commands.js'
import { CommandsGroupContext } from '../shared/types.js'
import { Command, LanguageCodes } from '@grammyjs/commands'
import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { controller as loginController } from './login.controller.js'

export class LogoutController<
  T extends CommandsGroupContext,
> extends BaseCommandController<T> {
  @addCommand
  public logout(): Command<T> {
    return super
      .command(getCommand('LOGOUT'), getDescription('LOGOUT'), async (ctx) => {
        console.log('LOGIN CONTROLLER', loginController)
        await ctx.reply('Bye')
        await ctx.setMyCommands(loginController)
      })
      .addToScope({
        type: 'all_group_chats',
      })
      .localize(
        LanguageCodes.Spanish,
        getCommand('DELETE_ACCOUNT', LanguageCodes.Spanish),
        getDescription('DELETE_ACCOUNT', LanguageCodes.Spanish)
      )
  }
}

const controller = new LogoutController()
export { controller }
