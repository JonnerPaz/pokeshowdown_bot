import { Bot, InlineKeyboard } from "grammy";
import { Pokemon } from "./pokeapi";
import { User } from "./User";

const API_KEY = "6836934004:AAHpDd_rCqfMwQOdzJWW6ljjoLDomELq5w4";

const bot = new Bot(API_KEY);

// Here must be stored all accounts in the group that are registered by /register
let userDB: User[] = []

bot.command("start", async ctx => {
  const msg = `Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, intercambiar y combatir como en las entregas originales de la saga pokemon`;
  return await ctx.reply(msg);
});

bot.command("register", ctx => {
  const userName = ctx.from?.username as string

  // Creates a new user. telegram Usernames are used as ID
  const newUser = new User(userName)

  const condition = userDB.some(el => el.getData.userName === newUser.getData.userName)
  if (condition) {
    return ctx.reply(`You are already registered. If you want to erase your data and start over, use /deleteaccount`)
  }

  // inserts new user into userDB array
  userDB.push(newUser)
  ctx.reply(`@${ctx.from?.username} have been registered`)
})

/* bot.command("pokemonGenerate", async ctx => {
  try {
    // here goes what is used in pokemon api 
  } catch (err) {
    console.log(err)
  }
}) */

bot.command("deleteaccount", async ctx => {
  const inlnKeyboard = new InlineKeyboard().text('YES', "delete").text('NO', "nothing")
  await ctx.reply(`@${ctx.from?.username} type "yes" if you want to delete your account`)
  await ctx.reply('Delete your account (including all of your data)?', {
    reply_markup: inlnKeyboard,
  })
})

bot.callbackQuery("delete", async ctx => {
  // delete inline_keyboard
  ctx.deleteMessages([<number>ctx.msg?.message_id])
  // Way to match user with userDB
  const userName = <string>ctx.from?.username
  const logic = userDB.some(el => el.getData.userName === userName) // true
  console.log(ctx.msg?.message_id)
  console.log(ctx.msg?.reply_markup?.inline_keyboard)

  // if user already exists, erase it
  if (logic) {
    const findUser = <User>userDB.find(el => el.getData.userName === userName)
    userDB.splice(userDB.indexOf(findUser))
    const msg = "Your account has now been erased. Sad to see you go!"
    await ctx.answerCallbackQuery(msg)
    await ctx.reply(msg)
  } else {
    const msg = `@${ctx.from.username} You're not registered. You can't erase other's accounts!`
    await ctx.answerCallbackQuery(msg)
    await ctx.reply(msg)
  }
})

bot.callbackQuery("nothing", async ctx => {
  await ctx.deleteMessage()
})

bot.command("stop", async ctx => {
  ctx.reply('this bot is stopping...')
  return await bot.stop()
})

bot.command("help", async ctx => {
  ctx.reply(`Here are some of the following commands that @${ctx.me.username} receives:
* /start - Starts de bot
* /register - register a user into the bot
* /deleteaccount - Delete your account from PokeBotShowdown
* /stop - Stops PokeBotShowdown - DO NOT USE IT`)
})


// commands can't have uppercase
bot.api.setMyCommands([
  { command: "start", description: "Starts the bot" },
  { command: "register", description: "register a user into the bot" },
  { command: "deleteaccount", description: "Delete your account from PokeBotShowdown" },
  { command: "stop", description: "Stops PokeBotShowdown" },
  { command: "help", description: "Show all commands" },
  // { command: "pokemonGenerate", description: "Start generating random pokemon" }
])

bot.start()
