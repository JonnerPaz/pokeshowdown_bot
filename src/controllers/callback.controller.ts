// import { addCommand } from '../shared/decorators/addCommand.decorator.js'
import { AppContext } from '../shared/types.js'
import { Bot } from 'grammy'
import { BaseCommandController } from '../shared/classes/BaseCommandController.js'

export class CallbackController<
  T extends AppContext,
> extends BaseCommandController<T> {
  constructor(public bot: Bot<T>) {
    super(bot)
  }

  // @addCommand
  // public async deleteAccountQuery() {
  //   this.bot.callbackQuery('delete-account', async (ctx) => {
  //     const msg = 'Your account was deleted'
  //     await ctx.editMessageReplyMarkup()
  //
  //     if (ctx.callbackQuery.message) {
  //       await ctx.deleteMessage()
  //     }
  //
  //     await ctx.reply(msg)
  //     await ctx.answerCallbackQuery({ text: msg })
  //   })
  // }
}
