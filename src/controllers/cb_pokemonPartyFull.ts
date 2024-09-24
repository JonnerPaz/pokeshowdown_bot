import { CallbackQueryContext, Context } from 'grammy'
import mongo from '../db/Mongo'
import { User } from '../classes/User'
import { PokemonRegistered } from '../types'
import pokemonGenerate from './pokemonGenerate'

export default async function cb_pokemonPartyFull(
  ctx: CallbackQueryContext<Context>
) {
  try {
    const user = (await mongo.findOneUser(ctx.from.username as string)) as User
    const choiceToDelete = ctx.callbackQuery.data.split('_').at(0) as string
    // gets pokemon to add thanks to inline keyboard text
    const choiceToAdd = ctx.callbackQuery.message?.text
      ?.split(' ')
      .at(3) as string
    await ctx.deleteMessage()

    const pokemonToDelete = user.pokemonParty.find(
      (el) => el.name === choiceToDelete
    ) as PokemonRegistered
    const pokemon = (await pokemonGenerate(choiceToAdd)) as PokemonRegistered

    await mongo.deletePokemon(user, pokemonToDelete)
    await mongo.addPokemon(user, pokemon)

    return await ctx.reply(`${pokemon.name} was added to your party!`)
  } catch (error) {
    throw error
  }
}
