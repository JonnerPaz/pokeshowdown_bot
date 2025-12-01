import { loadEnvFile } from 'process'
import 'reflect-metadata'
import { AppDataSource } from './data-source.js'
import { Bot, BotError, GrammyError, HttpError } from 'grammy'
import { commands } from '@grammyjs/commands'
import { controller as loginController } from './controllers/login.controller.js'
import { controller as logoutController } from './controllers/logout.controller.js'
import { GlobalContext } from './shared/types.js'

loadEnvFile()

const API_KEY = process.env.API_KEY as string
const PORT = process.env.PORT
// const RESOURCE = process.env.RESOURCE
export const bot: Bot<GlobalContext> = new Bot(API_KEY)

try {
  bot.use(commands())

  bot.use(loginController)
  bot.use(logoutController)

  await loginController.init()
  await logoutController.init()

  await loginController.setCommands(bot)

  await AppDataSource.initialize()
  await bot.start()
} catch (err) {
  bot.catch(async (err) => {
    const ctx = err.ctx
    console.error(`Error while handling update ${ctx.update.update_id}:`)
    const e = err.error
    if (e instanceof GrammyError) {
      await ctx.reply('there was an error: Error in request')
      console.error('Error in request:', e.description)
      bot.start()
    } else if (e instanceof HttpError) {
      await ctx.reply('There was an error: Could not contact Telegram')
      console.error('Could not contact Telegram:', e)
      bot.start()
    } else if (e instanceof BotError) {
      await ctx.reply('There was an error: ' + e.message)
      console.error('Error associate with BotError:', e)
      bot.start()
    } else {
      console.error('Unknown error:', e)
      bot.start()
    }
  })
}
