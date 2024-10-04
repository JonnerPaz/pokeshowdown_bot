import 'dotenv/config'
import generatePokemon from './controllers/pokemonGenerate'
import pokemonSummary from './controllers/pokemonSummary'
import listenUpdates from './controllers/listenUpdates'
import getHelp from './controllers/getHelp'
import evolvePokemon from './controllers/evolvePokemon'
import setupRegisterUser from './controllers/register/setupRegisterUser'
import registerUser from './controllers/register/registerUser'
import setupDeleteAccount from './controllers/delete/setupDeleteAccount'
import deleteAccount from './controllers/delete/deleteAccount'
import catchPokemon from './controllers/catch/catchPokemon'
import { RESET_LOOP } from './constants'
import { Composer, session } from 'grammy'
import commands from './controllers/commands'
import tradeRequest from './controllers/trade/tradeRequest'
import { conversations, createConversation } from '@grammyjs/conversations'
import { MainContext } from './types'
import cb_tradeResponse from './controllers/trade/cb_tradeResponse'
import initial from './db/grammySession'

export const events = new Composer<MainContext>()

let counter = 0

events.use(session({ initial }))
events.use(conversations())
events.use(createConversation(catchPokemon))
events.use(createConversation(registerUser))
events.use(createConversation(deleteAccount))
events.use(createConversation(cb_tradeResponse))

events.command('start', async (ctx) => {
  await ctx.api.setMyCommands(commands)
  return await ctx.reply(
    'Welcome to PokeBotShowdown. This is a bot created to catch, ' +
      'trade and battle against other player, like the original games and series'
  )
})

events.command('pokemonsummary', async (ctx) => await pokemonSummary(ctx))

events.command('register', async (ctx) => await setupRegisterUser(ctx))

events.command('pokemongenerate', async (ctx) => {
  if (ctx.chat.type !== 'private')
    return await ctx.reply('You can only use this command on private chats')
  await generatePokemon(ctx)
  return
})

events.command('deleteaccount', async (ctx) => await setupDeleteAccount(ctx))

events.command('help', async (ctx) => await getHelp(ctx))

events.command('evolve', async (ctx) => await evolvePokemon(ctx))

events.command('trade', async (ctx) => await tradeRequest(ctx))

events.command('cancel', async (ctx) => {
  await ctx.conversation.exit()
  return await ctx.reply('Process cancelled successfully.')
})

events.callbackQuery('cancel', async (ctx) => {
  await ctx.conversation.exit('cancel')
  await ctx.deleteMessage()
  return await ctx.reply('Process cancelled successfully')
})

// this must be the last controller
events.hears(/(?<!\/)\w/, async (ctx) => {
  try {
    counter++
    if (counter === RESET_LOOP) {
      await listenUpdates(ctx)
      counter = 0
    }
    return
  } catch (error) {
    throw error
  }
})
