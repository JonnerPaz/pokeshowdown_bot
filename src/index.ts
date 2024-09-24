import { Bot, BotError, GrammyError, HttpError } from 'grammy'
import 'dotenv/config'
import registerPokemon from './controllers/registerPokemon'
import cb_registerPokemon from './controllers/cb_registerPokemon'
import pokemonGenerate from './controllers/pokemonGenerate'
import cb_catch from './controllers/cb_catch'

const PORT = process.env.PORT
const RESOURCE = process.env.RESOURCE
const API_KEY = process.env.API_KEY as string
const bot = new Bot(API_KEY)

export default bot

bot.command('start', async (ctx) => {
  const msg =
    'Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, ' +
    'intercambiar y combatir como en las entregas originales de la saga pokemon'
  return await ctx.reply(msg)
})

bot.command('register', async (ctx) => await registerPokemon(ctx))

bot.callbackQuery(/starter[012]/, async (ctx) => await cb_registerPokemon(ctx))

bot.callbackQuery('cancel', async (ctx) => {
  ctx.deleteMessage()
  return ctx.reply('Process cancelled successfully')
})

bot.command('pokemongenerate', async (ctx) => await pokemonGenerate(ctx))

bot.callbackQuery('catch', async (ctx) => await cb_catch(ctx))

// Initialise Bot
// ACTIVATE THIS WHEN GOING ONLINE
/* const server = express()
server.use(express.json())
// This is what sends responses to the bot. DO NOT delete these lines
server.post('/webhook', webhookCallback(bot, 'express'))
server.listen(PORT)
bot.api.setWebhook(`${RESOURCE}/webhook`) */

bot.start()

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
