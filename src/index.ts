import { Bot, InlineKeyboard } from "grammy";
import { Pokemon } from "./pokeapi";
import { User } from "./User";

const API_KEY = "6836934004:AAHpDd_rCqfMwQOdzJWW6ljjoLDomELq5w4";

const bot = new Bot(API_KEY);

// Here must be stored all accounts in the group that are registered by /register
let userDB: User[] = []

bot.command("start", async ctx => {
  await bot.start();
  const welcomeMessage = `Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, intercambiar y combatir como en las entregas originales de la saga pokemon`;
  return await ctx.reply(welcomeMessage);
});

bot.command("register", ctx => {
  const userName = ctx.from?.username as string

  // Creates a new user. telegram Usernames are used as ID
  const newUser = new User(userName, 1)

  const condition = userDB.some(el => el.getData.userName === newUser.getData.userName)
  if (condition) {
    return ctx.reply(`You are already registered. If you want to erase your data and start over, use /deleteAccount`)
  }

  // inserts new user into userDB array
  userDB.push(newUser)
})

/* bot.command("pokemonGenerate", async ctx => {
  try {
    // here goes what is used in pokemon api 
  } catch (err) {
    console.log(err)
  }
}) */

bot.command("deleteAccount", async ctx => {
  await ctx.reply(`@${ctx.from?.username} type "yes" if you want to delete your account`)
  const inlnKeyboard = new InlineKeyboard().text('YES', "delete").text('NO')
  await ctx.reply('Delete your account (including all of your data)?', {
    reply_markup: inlnKeyboard,
  })
})

/* bot.callbackQuery("delete", async ctx => {
  console.log("log from callbackQuery")
  const context = <string> ctx.from?.username
  const logic = userDB.some(el => el.getData.userName === context)
  console.log(userDB)
  await ctx.reply("Your account has now been erased. Sad to see you go!")

}) */

bot.command("stop", async ctx => {
  ctx.reply('this bot is stopping...')
  return await bot.stop()
})


// commands can't have uppercase
bot.api.setMyCommands([
  { command: "start", description: "Starts the bot" },
  { command: "register", description: "register a user into the bot" },
  { command: "deleteaccount", description: "Delete your account from PokeBotShowdown" },
  { command: "stop", description: "Stops PokeBotShowdown" },
  // { command: "pokemonGenerate", description: "Start generating random pokemon" }
])

bot.start()
