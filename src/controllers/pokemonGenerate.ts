import pokeApi from '../classes/PokeApi'
import { InlineKeyboard } from 'grammy'
import { MainContext } from '../types'

/**
 * @param ctx {MainContext| string} Deliver ctx grammy context whenever possible. If passed a string,
 * it will return a pokemon with given string. Otherwise, it will return an error
 *
 */
export default async function generatePokemon(ctx: MainContext | string) {
  try {
    if (typeof ctx === 'string') {
      return await pokeApi.generatePokemon(ctx)
    }

    const pokemon = await pokeApi.generatePokemon()

    // create message with pokemon
    const caption = `A wild ${pokemon.name} appeared. Tap "CATCH" to get it`
    const inlnKeyboard = new InlineKeyboard().text('CATCH', 'catch')
    await ctx.replyWithPhoto(pokeApi.showPokemonPhoto(pokemon), {
      reply_markup: inlnKeyboard,
      caption: caption,
    })
    const conv = await ctx.conversation.enter('cb_catch')
  } catch (err) {
    throw err
  }
}
