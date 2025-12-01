import { LanguageCodes } from '@grammyjs/commands'

export const commands = {
  START: {
    [LanguageCodes.English]: {
      command: 'start',
      description: 'Starts the bot',
    },
    [LanguageCodes.Spanish]: {
      command: 'comenzar',
      description: 'Comienza el bot',
    },
  },
  REGISTER: {
    [LanguageCodes.English]: {
      command: 'register',
      description: 'register a user into the bot',
    },
    [LanguageCodes.Spanish]: {
      command: 'registrarse',
      description: 'registrarse en el bot',
    },
  },
  LOGOUT: {
    [LanguageCodes.English]: {
      command: 'logout',
      description: 'Logout of the bot',
    },
    [LanguageCodes.Spanish]: {
      command: 'cerrar_sesion',
      description: 'Cerrar sesion del bot',
    },
  },
  DELETE_ACCOUNT: {
    [LanguageCodes.English]: {
      command: 'delete_account',
      description: 'Delete your account from PokeBotShowdown',
    },
    [LanguageCodes.Spanish]: {
      command: 'borrar_cuenta',
      description: 'Borrar tu cuenta de PokeBotShowdown',
    },
  },
  HELP: {
    [LanguageCodes.English]: {
      command: 'help',
      description: 'Show all commands',
    },
    [LanguageCodes.Spanish]: {
      command: 'ayuda',
      description: 'Muestra todos los comandos',
    },
  },
  POKEMON_GENERATE: {
    [LanguageCodes.English]: {
      command: 'generate_pokemon',
      description: 'Generates a random pokemon',
    },
    [LanguageCodes.Spanish]: {
      command: 'generar_pokemon',
      description: 'Genera un pokemon aleatorio',
    },
  },
  MY_POKEMONS: {
    [LanguageCodes.English]: {
      command: 'pokemons',
      description: 'get an info of all your pokemons',
    },
    [LanguageCodes.Spanish]: {
      command: 'pokemons',
      description: 'obtener informacion de todos tus pokemons',
    },
  },
  EVOLVE: {
    [LanguageCodes.English]: {
      command: 'evolve',
      description: 'Evolve one of your pokemons!',
    },
    [LanguageCodes.Spanish]: {
      command: 'evolucionar',
      description: 'Evoluciona uno de tus pokemons!',
    },
  },
  TRADE: {
    [LanguageCodes.English]: {
      command: 'trade',
      description: 'Trade pokemons with your friends',
    },
    [LanguageCodes.Spanish]: {
      command: 'intercambiar',
      description: 'Intercambia pokemons con tus amigos',
    },
  },
} as const

export type CommandKeys = keyof typeof commands
export type Languages = keyof (typeof commands)[CommandKeys]

export function getCommand(command: CommandKeys, language: Languages = 'en') {
  return commands[command][language].command
}

export function getDescription(
  command: CommandKeys,
  language: Languages = 'en'
) {
  return commands[command][language].description
}

export function getAllCommands(language: Languages = 'en') {
  return Object.values(commands).map((command) => {
    return {
      command: command[language].command,
      description: command[language].description,
    }
  })
}

export default commands
