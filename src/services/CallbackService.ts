import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { AppContext } from '../shared/types.js'
import { Bot } from 'grammy'
import { BaseCommandController } from '../shared/classes/BaseCommandController.js'

export class CallbackService<
  T extends AppContext,
> extends BaseCommandController<T> {
  constructor(public bot: Bot<T>) {
    super(bot)
  }

  @addCommand
  public async deleteAccountQuery() {
    this.bot.callbackQuery('delete-account', async (ctx) => {
      await ctx.editMessageReplyMarkup()
      await ctx.reply('Your account was deleted')
      await ctx.answerCallbackQuery({ text: 'Account was deleted' })
    })
  }
}
