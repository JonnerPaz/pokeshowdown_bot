import { Bot } from "grammy";
import { Pokemon } from "./pokeapi";
import { User } from "./User";

const API_KEY = "6836934004:AAHpDd_rCqfMwQOdzJWW6ljjoLDomELq5w4";

const bot = new Bot(API_KEY);

bot.command("start", async ctx => {
  await bot.start();
  const welcomeMessage = `Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, intercambiar y combatir como en las entregas originales de la saga pokemon`;
  return await ctx.reply(welcomeMessage);
});

bot.command("register", ctx => {
  const userName = ctx.from?.username as string
  // Creates a new user. telegram Usernames are used as ID
  const user = new User(userName)
  console.log(user.getData)
  // console.log('chatMember', ctx.chatMember) // groups maybe?
  // const adminRights = await ctx.getMyDefaultAdministratorRights() // Later use
  // const chat = await ctx.getChat() // Possibly use for later
})

bot.command("pokemonGenerate", async ctx => {
  try {
    // here goes what is used in pokemon api 
  } catch (err) {
    console.log(err)
  }
})

bot.command("stop", async ctx => {
  ctx.reply('this bot is stopping...')
  return await bot.stop()
})


bot.api.setMyCommands([
  { command: "start", description: "Starts the bot" },
  { command: "register", description: "register a user into the bot" },
  { command: "stop", description: "Stops PokeBotShowdown" },
  // { command: "pokemonGenerate", description: "Start generating random pokemon" }
])

// prove if bot is working
/* bot.on("message", async res => {
  try {
    const message: string = res.message.text ?? "pikachu";
    const pokemon: string = await PokeBotShowdown.pokeRenderer(message);

    setInterval(() => res.api.sendPhoto(res.chat.id, pokemon), 5000);
    return res.api.sendPhoto(res.chat.id, pokemon);
  } catch (err) {
    console.error(err);
    return res.reply(`There was a problem: ${err}`);
  }
}); */

bot.start()
