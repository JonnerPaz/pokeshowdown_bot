import { LanguageCodes } from "@grammyjs/commands";
import type { LanguageCode } from "grammy/types";

export const commands = {
  START: {
    [LanguageCodes.English]: {
      command: "start",
      description: "Starts the bot",
    },
    [LanguageCodes.Spanish]: {
      command: "comenzar",
      description: "Comienza el bot",
    },
  },
  REGISTER: {
    [LanguageCodes.English]: {
      command: "register",
      description: "register a user into the bot",
    },
    [LanguageCodes.Spanish]: {
      command: "registrarse",
      description: "registrarse en el bot",
    },
  },
  DELETE_ACCOUNT: {
    [LanguageCodes.English]: {
      command: "delete_account",
      description: "Delete your account from PokeBotShowdown",
    },
    [LanguageCodes.Spanish]: {
      command: "borrar_cuenta",
      description: "Borrar tu cuenta de PokeBotShowdown",
    },
  },
  HELP: {
    [LanguageCodes.English]: {
      command: "help",
      description: "Show all commands",
    },
    [LanguageCodes.Spanish]: {
      command: "ayuda",
      description: "Muestra todos los comandos",
    },
  },
  POKEMON_GENERATE: {
    [LanguageCodes.English]: {
      command: "generate_pokemon",
      description: "Generates a random pokemon",
    },
    [LanguageCodes.Spanish]: {
      command: "generar_pokemon",
      description: "Genera un pokemon aleatorio",
    },
  },
  MY_POKEMONS: {
    [LanguageCodes.English]: {
      command: "pokemons",
      description: "get an info of all your pokemons",
    },
    [LanguageCodes.Spanish]: {
      command: "pokemons",
      description: "obtener informacion de todos tus pokemons",
    },
  },
  POKEMON_SUMMARY: {
    [LanguageCodes.English]: {
      command: "pokemonsummary",
      description: "View detailed stats of one of your pokemons",
    },
    [LanguageCodes.Spanish]: {
      command: "resumen_pokemon",
      description: "Ver estadisticas detalladas de uno de tus pokemons",
    },
  },
  EVOLVE: {
    [LanguageCodes.English]: {
      command: "evolve",
      description: "Evolve one of your pokemons!",
    },
    [LanguageCodes.Spanish]: {
      command: "evolucionar",
      description: "Evoluciona uno de tus pokemons!",
    },
  },
  SHINY: {
    [LanguageCodes.English]: {
      command: "shiny",
      description: "Make one of your pokemons shiny",
    },
    [LanguageCodes.Spanish]: {
      command: "brillante",
      description: "Haz brillante a uno de tus pokemons",
    },
  },
  TRADE: {
    [LanguageCodes.English]: {
      command: "trade",
      description: "Trade pokemons with your friends",
    },
    [LanguageCodes.Spanish]: {
      command: "intercambiar",
      description: "Intercambia pokemons con tus amigos",
    },
  },
  NICKNAME: {
    [LanguageCodes.English]: {
      command: "nickname",
      description: "Add a nickname to your pokemon",
    },
    [LanguageCodes.Spanish]: {
      command: "nickname",
      description: "Añade un nickname a tu pokemon",
    },
  },
  BATTLE: {
    [LanguageCodes.English]: {
      command: "battle",
      description: "Open a battle room in the Arena",
    },
    [LanguageCodes.Spanish]: {
      command: "batalla",
      description: "Abre una sala de combate en la Arena",
    },
  },
  POKEDEX: {
    [LanguageCodes.English]: {
      command: "pokedex",
      description: "Look up a Pokemon in the national Pokedex",
    },
    [LanguageCodes.Spanish]: {
      command: "pokedex",
      description: "Consulta un Pokemon en la Pokedex nacional",
    },
  },
  BAG: {
    [LanguageCodes.English]: {
      command: "bag",
      description: "View your Pokeballs and item inventory",
    },
    [LanguageCodes.Spanish]: {
      command: "mochila",
      description: "Ver tus Pokeballs y mochila de objetos",
    },
  },
  DAILY: {
    [LanguageCodes.English]: {
      command: "daily",
      description: "Claim your daily Pokeballs and streak bonus",
    },
    [LanguageCodes.Spanish]: {
      command: "diario",
      description: "Reclama tus Pokeballs diarias y bono de racha",
    },
  },
  PROFILE: {
    [LanguageCodes.English]: {
      command: "profile",
      description: "View your Trainer Card, battle records, and buddy",
    },
    [LanguageCodes.Spanish]: {
      command: "perfil",
      description: "Ver tu Tarjeta de Entrenador, historial de batallas y companero",
    },
  },
  LEADERBOARD: {
    [LanguageCodes.English]: {
      command: "leaderboard",
      description: "View the battle leaderboard and top trainers",
    },
    [LanguageCodes.Spanish]: {
      command: "ranking",
      description: "Ver la tabla de clasificacion y mejores entrenadores",
    },
  },
  BUDDY: {
    [LanguageCodes.English]: {
      command: "buddy",
      description: "Set your favorite buddy Pokemon",
    },
    [LanguageCodes.Spanish]: {
      command: "companero",
      description: "Establece tu Pokemon companero favorito",
    },
  },
  BOX: {
    [LanguageCodes.English]: {
      command: "box",
      description: "View and manage your PC Pokemon Storage Box",
    },
    [LanguageCodes.Spanish]: {
      command: "caja",
      description: "Ver y gestionar tu Caja de Almacenamiento Pokemon",
    },
  },
  RELEASE: {
    [LanguageCodes.English]: {
      command: "release",
      description: "Release a Pokemon and receive Pokeballs from Professor Oak",
    },
    [LanguageCodes.Spanish]: {
      command: "liberar",
      description: "Liberar un Pokemon y recibir Pokebolas del Profesor Oak",
    },
  },
} as const;

export type CommandKeys = keyof typeof commands;
export type Languages = keyof (typeof commands)[CommandKeys];

export function getCommand(command: CommandKeys, language: Languages = "en") {
  return commands[command][language].command;
}

export function getCommandInfo(command: CommandKeys, language: Languages = "en") {
  return commands[command][language];
}

export function getDescription(command: CommandKeys, language: Languages = "en") {
  return commands[command][language].description;
}

export function getAllCommands(language: Languages = "en") {
  return Object.values(commands).map((command) => {
    return {
      command: command[language].command,
      description: command[language].description,
    };
  });
}

export interface CommandRegistration {
  scope: { type: "default" | "all_group_chats" };
  language_code?: LanguageCode;
  commands: Array<{ command: string; description: string }>;
}

/**
 * Builds the full list of `setMyCommands` payloads: every supported scope
 * (default + group chats) for every supported language.
 */
export function getCommandRegistrations(): CommandRegistration[] {
  const scopes: CommandRegistration["scope"][] = [{ type: "default" }, { type: "all_group_chats" }];
  const languages: Array<{ key: Languages; language_code?: LanguageCode }> = [
    { key: LanguageCodes.English },
    { key: LanguageCodes.Spanish, language_code: LanguageCodes.Spanish },
  ];

  return scopes.flatMap((scope) =>
    languages.map((language) => ({
      scope,
      ...(language.language_code ? { language_code: language.language_code } : {}),
      commands: getAllCommands(language.key),
    })),
  );
}

export default commands;
