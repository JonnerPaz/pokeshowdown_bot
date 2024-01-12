import { Bot } from "grammy";
import { pokeShowdown } from "./pokeapi";

const API_KEY = "6836934004:AAHpDd_rCqfMwQOdzJWW6ljjoLDomELq5w4";

const bot = new Bot(API_KEY);

bot.command("start", res => res.reply("Tu mamá es Lesbiana"));

bot.on("message", async res => {
	const message = res.message.text || "pikachu";

	const pokemon: string = await pokeShowdown.pokeRenderer(message);
	return res.reply(pokemon);
});

bot.start();
