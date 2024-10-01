import mongo from '../db/Mongo'
import { MAX_PKMN_PARTY } from '../constants'
import generatePokemon from './pokemonGenerate'
import { ConversationCB, MainContext, PokemonRegistered } from '../types'
import updatePokemonCount from './pokemonInParty'
import displayMaxPokemonParty from './maxPokemonParty'
import cb_pokemonPartyFull from './cb_pokemonPartyFull'

export default async function cb_catch(conv: ConversationCB, ctx: MainContext) {
  try {
    const cbReply = await conv.waitForCallbackQuery('catch')
    const user = await conv.external(
      async () => await mongo.findOneUser(cbReply.from?.username as string)
    )
    if (!user)
      return await ctx.reply(
        `Error Procesing the request. The pokemon may be missing or you're not registered`
      )

    const chat = await ctx.getChat()
    await ctx.api.deleteMessage(chat.id, cbReply.msgId as number)

    const pokemon = cbReply.callbackQuery.message?.caption
      ?.split(' ')
      .at(2) as string
    const pokemonInParty =
      user.pokemonParty.find((el) => el.name === pokemon) ?? null

    if (pokemonInParty) {
      return await updatePokemonCount(cbReply, user, pokemonInParty, pokemon)
    }

    if (user.pokemonParty.length >= MAX_PKMN_PARTY) {
      console.log('enter MAX_PKMN_PARTY')
      const { msg, keyboard } = displayMaxPokemonParty(cbReply, user, pokemon)
      await ctx.reply(msg, keyboard)
      const res = await conv.waitFrom(user.tlgID)
      if (res)
        return await cb_pokemonPartyFull(
          conv,
          ctx,
          user,
          res.callbackQuery?.data as string
        )
    }

    // Add new pokemon
    const choice = (await generatePokemon(pokemon)) as PokemonRegistered
    await mongo.addPokemon(user, choice)
    return await ctx.reply(`@${user.userName} has captured a ${choice.name}`)
  } catch (err) {
    throw err
  }
}
