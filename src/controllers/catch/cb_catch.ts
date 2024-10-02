import mongo from '../../db/Mongo'
import { MAX_PKMN_PARTY } from '../../constants'
import generatePokemon from '../pokemonGenerate'
import { ConversationCB, PokemonRegistered } from '../../types'
import updatePokemonCount from '../pokemonInParty'
import partyFull from './partyFull'

export default async function cb_catch(conv: ConversationCB) {
  try {
    const ctx = await conv.waitForCallbackQuery('catch')
    await ctx.deleteMessages([ctx.session.messageToDelete])

    const user = await conv.external(() =>
      mongo.findOneUser(ctx.from?.username as string)
    )
    if (!user)
      return await ctx.reply(
        `Error Procesing the request. The pokemon may be missing or you're not registered`
      )

    const queryPokemon = ctx.callbackQuery.message?.caption
      ?.split(' ')
      .at(2) as string
    const pokemonInParty =
      user.pokemonParty.find((el) => el.name === queryPokemon) ?? null

    if (pokemonInParty) {
      return await updatePokemonCount(ctx, user, pokemonInParty, queryPokemon)
    }

    if (user.pokemonParty.length >= MAX_PKMN_PARTY) {
      return await partyFull(conv, ctx, user, queryPokemon)
    }

    // Add new pokemon
    const choice = (await generatePokemon(queryPokemon)) as PokemonRegistered
    await mongo.addPokemon(user, choice)
    return await ctx.reply(`@${user.userName} has captured a ${choice.name}`)
  } catch (err) {
    throw err
  }
}
