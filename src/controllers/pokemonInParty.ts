import { CallbackQueryContext, Context } from 'grammy'
import { pokeApi } from '../index'
import mongo from '../db/Mongo'
import { PokemonRegistered } from '../types'
import { User } from '../classes/User'

/**
 * update pokemon counter if user already catched that pokemon
 * */
export default async function updatePokemonCount(
  ctx: CallbackQueryContext<Context>,
  user: User,
  pokemonInParty: PokemonRegistered,
  pokemonName: string
) {
  try {
    const counter = pokeApi.updateCounter(pokemonInParty)
    await mongo.updatePokemonCount(user, [pokemonName, counter])
    await ctx.reply(
      `You have catched a ${pokemonName}. You've cached ${pokemonName} ${pokemonInParty?.counter} times`
    )
    return
  } catch (err) {
    throw err
  }
}
