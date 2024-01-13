import { Bot } from "grammy";

interface PokemonSummary {
	id: number;
	ability: {
		name: string;
		url: string;
		is_hidden: boolean;
	};
	moves: {
		move: {
			name: string;
			url: string;
		};
	};
	name: string;
	type: {
		name: string;
		url: string;
	};
}

class User {
	start(bot: Bot) {
		const welcomeMessage = `Bienvenido a PokeBotShowdown. Bot creado para capturar, intercambiar y combatir con pokemones`;
		bot.command("start", res => res.reply("Bienvenido a PokeBotShowDown"));
	}

	async catchPokemon() {}
}

export const pokeBotShowdown: User = new User();
