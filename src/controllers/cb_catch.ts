import mongo from '../db/Mongo'
import { MAX_PKMN_PARTY } from '../constants'
import generatePokemon from './pokemonGenerate'
import { ConversationCB, MainContext, PokemonRegistered } from '../types'
import updatePokemonCount from './pokemonInParty'
import maxPokemonParty from './maxPokemonParty'

export default async function cb_catch(conv: ConversationCB, ctx: MainContext) {
  try {
    const newCtx = await conv.waitForCallbackQuery('catch')
    const user = await mongo.findOneUser(newCtx.from?.username as string)
    if (!user)
      throw new Error(
        `Error Procesing the request. The pokemon may be missing or you're not registered`
      )

    const pokemon = newCtx.callbackQuery.message?.caption
      ?.split(' ')
      .at(2) as string
    const pokemonInParty =
      user.pokemonParty.find((el) => el.name === pokemon) ?? null

    await ctx.api.deleteMessage(
      newCtx.chat?.id as number,
      newCtx.msgId as number
    )

    if (pokemonInParty) {
      await updatePokemonCount(newCtx, user, pokemonInParty, pokemon)
      return
    }

    if (user.pokemonParty.length >= MAX_PKMN_PARTY) {
      await maxPokemonParty(newCtx, user, pokemon)
      await newCtx.conversation.enter('cb_pokemonPartyFull')
      return
    }

    // Add new pokemon
    const choice = (await generatePokemon(pokemon)) as PokemonRegistered
    await mongo.addPokemon(user, choice)
    await ctx.reply(`@${user.userName} has captured a ${choice.name}`)

    return
  } catch (err) {
    await ctx.reply(
      `Error while processing your capture. Try again or contact the author of this plugin`
    )
    throw err
  }
}
