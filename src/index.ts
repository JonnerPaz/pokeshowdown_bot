import { Bot, BotError, GrammyError, HttpError, webhookCallback } from 'grammy'
import commands from './controllers/commands'
import { events } from './events'
import express from 'express'

const PORT = process.env.PORT
const RESOURCE = process.env.RESOURCE
const API_KEY = process.env.API_KEY as string

export const bot = new Bot(API_KEY)

export default bot

// Initialise Bot
const server = express()
server.use(express.json())
server.use('/webhook', webhookCallback(bot, 'express'))
bot.use(events)

bot.api.setWebhook(`${RESOURCE}/webhook`)
server.listen(8080)

// bot.api.setMyCommands(commands)

// bot.start()

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
