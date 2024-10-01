import mongo from '../db/Mongo'
import { MAX_PKMN_PARTY } from '../constants'
import generatePokemon from './pokemonGenerate'
import { ConversationCB, PokemonRegistered } from '../types'
import updatePokemonCount from './pokemonInParty'
import displayMaxPokemonParty from './maxPokemonParty'
import cb_pokemonPartyFull from './cb_pokemonPartyFull'

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

    const pokemon = ctx.callbackQuery.message?.caption
      ?.split(' ')
      .at(2) as string
    const pokemonInParty =
      user.pokemonParty.find((el) => el.name === pokemon) ?? null

    if (pokemonInParty) {
      return await updatePokemonCount(ctx, user, pokemonInParty, pokemon)
    }

    if (user.pokemonParty.length >= MAX_PKMN_PARTY) {
      const { msg, keyboard } = displayMaxPokemonParty(user, pokemon)
      const messageToDelete = await ctx.reply(msg, keyboard)
      ctx.session.messageToDelete = messageToDelete.message_id

      const res = await conv.waitForCallbackQuery(/choice[012345]/)
      // const userCatch = await conv.waitFrom(user.tlgID)
      if (res.callbackQuery.from.id === user.tlgID)
        return await cb_pokemonPartyFull(res, user)
      return ctx.reply(`You don't pressed the catch button. request cancelled!`)
    }

    // Add new pokemon
    const choice = (await generatePokemon(pokemon)) as PokemonRegistered
    await mongo.addPokemon(user, choice)
    return await ctx.reply(`@${user.userName} has captured a ${choice.name}`)
  } catch (err) {
    throw err
  }
}
