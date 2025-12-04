import 'reflect-metadata'
import { loadEnvFile } from 'process'
import { AppDataSource } from './data-source.js'
import { BotError, GrammyError, HttpError } from 'grammy'
import { AppContainer } from './app.container.js'

loadEnvFile()

const API_KEY = process.env.API_KEY as string
// const PORT = process.env.PORT
// const RESOURCE = process.env.RESOURCE

try {
  const app = new AppContainer(API_KEY)

  await app.setup()

  // set initial cmds
  await app.loginController.setCommands(app.bot)

  app.bot.catch(async (err) => {
    const ctx = err.ctx
    console.error(`Error while handling update ${ctx.update.update_id}:`)
    const e = err.error

    if (e instanceof GrammyError) {
      await ctx.reply('there was an error: Error in request')
      console.error('Error in request:', e.description)
    } else if (e instanceof HttpError) {
      await ctx.reply('There was an error: Could not contact Telegram')
      console.error('Could not contact Telegram:', e)
    } else if (e instanceof BotError) {
      await ctx.reply('There was an error: ' + e.message)
      console.error('Error associate with BotError:', e)
    } else {
      console.error('Unknown error:', e)
    }
  })

  // DB connection
  await AppDataSource.initialize()
  // start bot
  await app.bot.start()
} catch (err) {
  console.error(err)
}
