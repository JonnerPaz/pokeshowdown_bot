import { CallbackQueryContext } from 'grammy'
import mongo from '../../db/Mongo'
import { MainContext, PokemonRegistered, UserRegistered } from '../../types'
import generatePokemon from '../pokemonGenerate'

export default async function replacePokemonInParty(
  ctx: MainContext,
  user: UserRegistered
) {
  try {
    await ctx.deleteMessages([ctx.session.messageToDelete])

    const choiceToDelete = ctx.callbackQuery?.data!.split('_').at(0) as string
    // gets pokemon to add thanks to inline keyboard text
    const choiceToAdd = ctx.callbackQuery!.message?.text?.split(' ').at(3)

    const pokemonToDelete = user.pokemonParty.find(
      (el) => el.name === choiceToDelete
    ) as PokemonRegistered
    const pokemonToAdd = (await generatePokemon(
      choiceToAdd!
    )) as PokemonRegistered

    await mongo.deletePokemon(user, pokemonToDelete)
    await mongo.addPokemon(user, pokemonToAdd)

    return await ctx.reply(`${pokemonToAdd.name} was added to your party!`)
  } catch (error) {
    throw error
  }
}
