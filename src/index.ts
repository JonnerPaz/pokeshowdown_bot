import { Bot } from "grammy";
import { pokeShowdown } from "./pokeapi";

const API_KEY = "6836934004:AAHpDd_rCqfMwQOdzJWW6ljjoLDomELq5w4";

const bot = new Bot(API_KEY);

bot.command("start", res => res.reply("Tu mamá es Lesbiana"));

bot.on("message", async res => {
	try {
		const message: string = res.message.text ?? "pikachu";

		const pokemon: string = await pokeShowdown.pokeRenderer(message);
		return res.api.sendPhoto(res.chat.id, pokemon);
		// return res.reply(pokemon);
	} catch (err) {
		console.error(err);
		return `There was a problem: ${err}`;
	}
});

// catches pokemon on telegram

bot.start();
