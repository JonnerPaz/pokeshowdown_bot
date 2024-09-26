import 'dotenv/config'
import registerPokemon from './controllers/registerPokemon'
import cb_registerPokemon from './controllers/cb_registerPokemon'
import pokemonGenerate from './controllers/pokemonGenerate'
import cb_catch from './controllers/cb_catch'
import cb_pokemonPartyFull from './controllers/cb_pokemonPartyFull'
import deleteAccount from './controllers/deleteAccount'
import cb_deleteAccount from './controllers/cb_deleteAccount'
import pokemonSummary from './controllers/pokemonSummary'
import listenUpdates from './controllers/listenUpdates'
import getHelp from './controllers/getHelp'
import evolvePokemon from './controllers/evolvePokemon'
import { RESET_LOOP } from './constants'
import { Composer } from 'grammy'

export const events = new Composer()
let counter = 0

events.command('start', async (ctx) => {
  const msg =
    'Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, ' +
    'intercambiar y combatir como en las entregas originales de la saga pokemon'
  return await ctx.reply(msg)
})

events.command('pokemonsummary', async (ctx) => await pokemonSummary(ctx))

events.command('register', async (ctx) => await registerPokemon(ctx))

events.callbackQuery(
  /starter[012]/,
  async (ctx) => await cb_registerPokemon(ctx)
)

events.callbackQuery('cancel', async (ctx) => {
  await ctx.deleteMessage()
  return await ctx.reply('Process cancelled successfully')
})

events.command('pokemongenerate', async (ctx) => await pokemonGenerate(ctx))

events.callbackQuery('catch', async (ctx) => await cb_catch(ctx))

events.callbackQuery(
  /choice[012345]/,
  async (ctx) => await cb_pokemonPartyFull(ctx)
)

events.command('deleteaccount', async (ctx) => await deleteAccount(ctx))

events.callbackQuery('delete', async (ctx) => await cb_deleteAccount(ctx))

events.command('help', async (ctx) => await getHelp(ctx))

events.command('evolve', async (ctx) => await evolvePokemon(ctx))

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
