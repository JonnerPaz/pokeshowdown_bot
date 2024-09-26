import { Context, HearsContext, InlineKeyboard } from 'grammy'
import pokeApi from '../classes/PokeApi'

export default async function listenUpdates(ctx: HearsContext<Context>) {
  try {
    const pokemon = await pokeApi.generatePokemon('typhlosion')

    const caption = `A wild ${pokemon.name} appeared. Tap "CATCH" to get it`
    const inlnKeyboard = new InlineKeyboard().text('CATCH', 'catch')
    await ctx.replyWithPhoto(pokeApi.showPokemonPhoto(pokemon), {
      reply_markup: inlnKeyboard,
      caption: caption,
    })
  } catch (err) {
    throw err
  }
}
