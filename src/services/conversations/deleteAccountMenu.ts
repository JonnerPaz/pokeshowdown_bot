import { Menu } from '@grammyjs/menu'
import { AppContext } from '../../shared/types.js'

export const deleteAccountMenu = new Menu<AppContext>('delete-account-menu')
  .text('Yes', async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.conversation.enter('deleteAccount')
    ctx.menu.close()
  })
  .text('No', async (ctx) => {
    await ctx.answerCallbackQuery()
    await ctx.editMessageText('Account was not deleted')
  })
