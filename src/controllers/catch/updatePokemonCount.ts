import { CallbackQueryContext, Context } from 'grammy'
import pokeApi from '../../classes/PokeApi'
import mongo from '../../db/Mongo'
import { UserRegistered, PokemonRegistered } from '../../types'

/**
 * update pokemon counter if user already catched that pokemon
 * */
export default async function updatePokemonCount(
  ctx: CallbackQueryContext<Context>,
  user: UserRegistered,
  pokemonInParty: PokemonRegistered,
  pokemonName: string
) {
  try {
    const counter = pokeApi.updateCounter(pokemonInParty)
    await mongo.updatePokemonCount(user, [pokemonName, counter])
    return await ctx.reply(
      `@${user.userName} has captured a ${pokemonName}. You've captured ${pokemonName} ${pokemonInParty?.counter} times`
    )
  } catch (err) {
    throw err
  }
}
