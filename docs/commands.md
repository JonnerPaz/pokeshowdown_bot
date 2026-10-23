# Commands

Telegram command menus are registered in English by default and in Spanish for
clients using `language_code=es`. The command names below are the literal
commands sent to the bot.

Commands are lowercase and start with `/`. All commands live in
`src/presentation/controllers/commands.ts`.

## Account and setup

| English           | Spanish          | Description                                      |
| :---------------- | :--------------- | :----------------------------------------------- |
| `/start`          | `/comenzar`      | Start the bot and show the welcome message.      |
| `/register`       | `/registrarse`   | Register a trainer and choose a starter Pokémon. |
| `/help`           | `/ayuda`         | Show the command list and help.                  |
| `/delete_account` | `/borrar_cuenta` | Delete the trainer account and Pokémon data.     |

## Encounters, bag, and daily rewards

| English             | Spanish            | Description                                 |
| :------------------ | :----------------- | :------------------------------------------ |
| `/generate_pokemon` | `/generar_pokemon` | Spawn a wild Pokémon encounter.             |
| `/bag`              | `/mochila`         | View Pokéballs and the item inventory.      |
| `/daily`            | `/diario`          | Claim daily Pokéballs and the streak bonus. |

## Collection and progression

| English           | Spanish            | Description                                               |
| :---------------- | :----------------- | :-------------------------------------------------------- |
| `/pokemons`       | `/pokemons`        | Open the interactive carousel for the active party.       |
| `/pokemonsummary` | `/resumen_pokemon` | View detailed stats, BST, and nicknames for a Pokémon.    |
| `/box`            | `/caja`            | Browse PC storage and withdraw, deposit, or swap Pokémon. |
| `/release`        | `/liberar`         | Release a Pokémon for Professor Oak's Pokéball rewards.   |
| `/evolve`         | `/evolucionar`     | Evolve a Pokémon when its catch threshold is met.         |
| `/shiny`          | `/brillante`       | Convert a qualified Pokémon into its shiny form.          |
| `/nickname`       | `/nickname`        | Set a custom nickname for a Pokémon.                      |

## Battle and social

| English   | Spanish         | Description                                                  |
| :-------- | :-------------- | :----------------------------------------------------------- |
| `/battle` | `/batalla`      | Create a Battle Arena room and open the Mini App.            |
| `/trade`  | `/intercambiar` | Propose a secure trade with another trainer in a group chat. |

### `/battle` behavior

- **Group chat:** the bot creates a room and posts a `startapp` deep-link button.
  Another trainer taps it to join in the Mini App.
- **Private chat:** the bot creates a room and posts a `web_app` button that opens
  the Arena directly.
- **No web layer:** if `WEBAPP_URL` is empty or invalid, `/battle` replies that the
  Arena is unavailable.
- **One active room:** a trainer cannot create or join a second room while they
  are already in one.

See [Mini App Arena](mini-app-arena.md) for the full flow.

## Pokédex, profile, and information

| English        | Spanish      | Description                                             |
| :------------- | :----------- | :------------------------------------------------------ |
| `/pokedex`     | `/pokedex`   | Look up a Pokémon by name or national Dex number.       |
| `/profile`     | `/perfil`    | View your Trainer Card, battle record, rank, and buddy. |
| `/leaderboard` | `/ranking`   | View the global top 10 and your position.               |
| `/buddy`       | `/companero` | Choose the Pokémon that accompanies your profile.       |

## Inline mode

Inline queries work from any chat where the bot can be mentioned:

| Query            | Result                                               |
| :--------------- | :--------------------------------------------------- |
| `@bot <pokemon>` | Pokédex preview card with artwork, types, and stats. |
| `@bot buddy`     | The caller's buddy, rank, and win rate.              |
| `@bot team`      | The caller's active six-member party.                |

Inline responses are visible to the chat where they are shared. Do not use them
to expose private trainer details in an untrusted group.
