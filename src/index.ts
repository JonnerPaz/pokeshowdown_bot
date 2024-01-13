import { Bot } from "grammy";
import { PokeBotShowdown } from "./Pokeapi";

const API_KEY = "6836934004:AAHpDd_rCqfMwQOdzJWW6ljjoLDomELq5w4";

const bot = new Bot(API_KEY);

bot.command("start", res => {
	const welcomeMessage = `Bienvenido a PokeBotShowdown. Este es un Bot creado para capturar, intercambiar y combatir como en las entregas originales de la saga pokemon`;
	return res.reply(welcomeMessage);
});

bot.on("message", async res => {
	try {
		const message: string = res.message.text ?? "pikachu";
		const pokemon: string = await PokeBotShowdown.pokeRenderer(message);

		setInterval(() => res.api.sendPhoto(res.chat.id, pokemon), 5000);
		return res.api.sendPhoto(res.chat.id, pokemon);
	} catch (err) {
		console.error(err);
		return res.reply(`There was a problem: ${err}`);
	}
});

bot.start();
