import { CommandsGroupContext } from '../shared/types'
import { Command, LanguageCodes } from '@grammyjs/commands'
import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { BaseCommandController } from '../shared/classes/BaseCommandController.js'

enum LoginStates {
  START = 'start',
}

export class LoginController<
  T extends CommandsGroupContext,
> extends BaseCommandController<T> {
  @addCommand
  public startCheck(): Command<T> {
    return super
      .command(
        LoginStates.START,
        'Fuck',
        async (ctx) => await ctx.reply('Hello, world. AMERICA')
      )
      .localize(LanguageCodes.Spanish, 'comenzar', 'Coger|meter')
  }
}
