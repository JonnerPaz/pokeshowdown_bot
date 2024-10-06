import { HearsContext, InlineKeyboard } from 'grammy'
import pokeApi from '../classes/PokeApi'
import { MainContext } from '../types'

export default async function listenUpdates(ctx: HearsContext<MainContext>) {
  try {
    const pokemon = await pokeApi.generatePokemon()

    const caption = `A wild ${pokemon.name} appeared. Tap "CATCH" to get it`
    const inlnKeyboard = new InlineKeyboard().text('CATCH', 'catch')
    const msg = await ctx.replyWithPhoto(pokeApi.showPokemonPhoto(pokemon), {
      reply_markup: inlnKeyboard,
      caption: caption,
    })

    ctx.session.messageToDelete = msg.message_id
    await ctx.conversation.enter('catchPokemon')
  } catch (err) {
    throw err
  }
}
