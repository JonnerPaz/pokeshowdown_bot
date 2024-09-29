import mongo from '../db/Mongo'
import { User } from '../classes/User'
import { ConversationCB, MainContext, PokemonRegistered } from '../types'
import generatePokemon from './pokemonGenerate'

export default async function cb_pokemonPartyFull(
  conv: ConversationCB,
  ctx: MainContext
) {
  try {
    const newCtx = await conv.waitForCallbackQuery(/choice[012345]/)
    const user = (await mongo.findOneUser(
      newCtx.from.username as string
    )) as User
    const choiceToDelete = newCtx.callbackQuery.data.split('_').at(0) as string
    // gets pokemon to add thanks to inline keyboard text
    const choiceToAdd = newCtx.callbackQuery.message?.text
      ?.split(' ')
      .at(3) as string

    await ctx.api.deleteMessage(
      newCtx.chat?.id as number,
      newCtx.msgId as number
    )

    const pokemonToDelete = user.pokemonParty.find(
      (el) => el.name === choiceToDelete
    ) as PokemonRegistered
    const pokemon = (await generatePokemon(choiceToAdd)) as PokemonRegistered

    await mongo.deletePokemon(user, pokemonToDelete)
    await mongo.addPokemon(user, pokemon)

    return await ctx.reply(`${pokemon.name} was added to your party!`)
  } catch (error) {
    throw error
  }
}
