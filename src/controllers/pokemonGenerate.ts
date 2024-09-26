import pokeApi from '../classes/PokeApi'
import { CommandContext, Context, InlineKeyboard } from 'grammy'

/**
 * @param ctx {CommandContext<Context> | string} Deliver ctx grammy context whenever possible. If passed a string,
 * it will return a pokemon with given string. Otherwise, it will return an error
 *
 */
export default async function pokemonGenerate(
  ctx: CommandContext<Context> | string
) {
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
  } catch (err) {
    throw err
  }
}
