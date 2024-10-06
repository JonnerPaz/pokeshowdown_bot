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
    const [userReq, userRes] = users
    const msg = `Select pokemon to transfer (Beware: Once selected, there is no turning back)`
    let messageToDelete
    let pokemonFromUserReq: PokemonRegistered
    let pokemonFromUserRes: PokemonRegistered

    // Get choices of each user
    for (const user of users) {
      const userId =
        user.userName === userReq.userName
          ? ctx.session.userReqId
          : ctx.session.userResId
      const keyboard = createInlineKeyboard(null, user.pokemonParty).text(
        'cancel',
        'cancel'
      )
      messageToDelete = await ctx.reply(`@${user.userName} ${msg}`, {
        reply_markup: keyboard,
      })
      const proposal = await conv.waitFrom(userId)
      console.log(user.tlgID)
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
    await mongo.deletePokemon(userReq, pokemonFromUserReq!)
    await mongo.addPokemon(userReq, pokemonFromUserRes!)

    await mongo.deletePokemon(userRes, pokemonFromUserRes!)
    await mongo.addPokemon(userRes, pokemonFromUserReq!)
    return await ctx.reply(
      'Trade completed! You can now check your pokemons :)'
    )
  } catch (error) {
    throw error
  }
}
