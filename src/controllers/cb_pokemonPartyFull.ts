import mongo from '../db/Mongo'
import {
  ConversationCB,
  MainContext,
  PokemonRegistered,
  UserRegistered,
} from '../types'
import generatePokemon from './pokemonGenerate'

export default async function cb_pokemonPartyFull(
  conv: ConversationCB,
  ctx: MainContext,
  user: UserRegistered,
  query: string
) {
  try {
    const cbReply = await conv.waitForCallbackQuery(/choice[012345]/)
    // const ctx = await conv.waitForCallbackQuery(/choice[012345]/)

    const chat = await ctx.getChat()
    await cbReply.api.deleteMessage(chat.id, cbReply.msgId as number)

    const choiceToDelete = query.split('_').at(0) as string
    // gets pokemon to add thanks to inline keyboard text
    const choiceToAdd = cbReply.callbackQuery.message?.text
      ?.split(' ')
      .at(3) as string
    console.log('choiceToAdd:', choiceToAdd)

    const pokemonToDelete = user.pokemonParty.find(
      (el) => el.name === choiceToDelete
    ) as PokemonRegistered
    const pokemon = (await generatePokemon(choiceToAdd)) as PokemonRegistered

    await conv.external(() => mongo.deletePokemon(user, pokemonToDelete))
    await conv.external(() => mongo.addPokemon(user, pokemon))

    return await ctx.reply(`${pokemon.name} was added to your party!`)
  } catch (error) {
    throw error
  }
}
