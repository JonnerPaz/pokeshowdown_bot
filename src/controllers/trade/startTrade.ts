import mongo from '../../db/Mongo'
import {
  ConversationCB,
  MainContext,
  PokemonRegistered,
  UserRegistered,
} from '../../types'
import createInlineKeyboard from '../../utils/createInlineKeyboard'

export default async function startTrade(
  conv: ConversationCB,
  ctx: MainContext,
  users: UserRegistered[]
) {
  try {
    const [userReq] = users
    const msg = `@${userReq.userName}, Select pokemon to transfer (Beware: Once selected, there is no turning back)`
    let messageToDelete
    let pokemonFromUserReq: PokemonRegistered
    let pokemonFromUserRes: PokemonRegistered

    // Get choices of each user
    for (const user of users) {
      const keyboard = createInlineKeyboard(null, user.pokemonParty).text(
        'cancel',
        'cancel'
      )
      messageToDelete = await ctx.reply(msg, { reply_markup: keyboard })
      const proposal = await conv.waitFrom(user.tlgID)
      await ctx.deleteMessages([messageToDelete.message_id])
      const pokemon = user.pokemonParty.find(
        (el) => el.name === proposal.callbackQuery?.data?.split('_').at(0)
      ) as PokemonRegistered

      if (proposal.from.username === userReq.userName) {
        pokemonFromUserReq = pokemon
      } else {
        pokemonFromUserRes = pokemon
      }
    }

    // Complete trade
    for (const user of users) {
      if (user.userName === userReq.userName) {
        await mongo.deletePokemon(user, pokemonFromUserReq!)
        await mongo.addPokemon(user, pokemonFromUserRes!)
      } else {
        await mongo.deletePokemon(user, pokemonFromUserRes!)
        await mongo.addPokemon(user, pokemonFromUserReq!)
      }
    }
    return await ctx.reply(
      'Trade completed! You can now check your pokemons :)'
    )
  } catch (error) {
    throw error
  }
}
