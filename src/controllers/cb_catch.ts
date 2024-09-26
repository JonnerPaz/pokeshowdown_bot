import { CallbackQueryContext, Context } from 'grammy'
import mongo from '../db/Mongo'
import { MAX_PKMN_PARTY } from '../constants'
import pokemonGenerate from './pokemonGenerate'
import { PokemonRegistered } from '../types'
import updatePokemonCount from './pokemonInParty'
import maxPokemonParty from './maxPokemonParty'

export default async function cb_catch(ctx: CallbackQueryContext<Context>) {
  try {
    const user = await mongo.findOneUser(ctx.from.username as string)
    await ctx.deleteMessage()

    if (!user)
      throw new Error(
        `Error Procesing the request. The pokemon may be missing or you're not registered`
      )

    const pokemon = ctx.callbackQuery.message?.caption
      ?.split(' ')
      .at(2) as string
    const pokemonInParty =
      user.pokemonParty.find((el) => el.name === pokemon) ?? null

    if (pokemonInParty) {
      await updatePokemonCount(ctx, user, pokemonInParty, pokemon)
      return
    }

    if (user.pokemonParty.length >= MAX_PKMN_PARTY) {
      await maxPokemonParty(ctx, user, pokemon)
      return
    }

    // Add new pokemon
    const choice = (await pokemonGenerate(pokemon)) as PokemonRegistered
    await mongo.addPokemon(user, choice)
    await ctx.reply(`@${user.userName} has captured a ${choice.name}`)
    return
  } catch (err) {
    await ctx.reply(err as string)
    console.error(err)
  }
}
