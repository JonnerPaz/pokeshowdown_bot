# PokeBotShowdown - A telegram bot to catch and trade pokemon with your friends!

## 🌟 Inspiration

I played long ago pokemon showdown and I find fun to build this bot now that I know one thing or two about programming. Besides, telegram is the chat app that I use the most. 

I want to build fun stuff and that's it.

## 🚀 How to run it locally

> [!WARNING]
> This file mentions some configurations that, in case you decide to run your own instance of this bot, you CAN'T share with anyone, including your bot token, the database password, nor any data that goes inside the .env file.
> For security purposes, keep this to yourself.

1. Clone this repository
2. Inside the project folder, run `pnpm install` (Node 22 + Corepack)
3. Setup your `.env` file. A sample file is provided `env-sample.env`
4. Run `pnpm dev` for watch mode or `pnpm start` for a single run
    - **API_KEY:** The token that [@BotFather](https://telegram.me/BotFather) gives you.
    - **PORT:** Port on which the bot will run
    - **Resource:** URL where webhooks are handled
    - **AUTHOR:** Author of the bot. Mine is used by default, but you can leave yours

> To run this bot using webhooks, you must use a website that supports webhooks. I use [localhost.run](https://localhost.run/) when testing the bot locally.

## 👤 Core Commands

- `/register:` Register a user into the bot. Note that if you're not registered into the bot.
- `/delete_account:` This deletes your user (and all your pokemons) from the bot.
- `/pokemongenerate:` Generate random pokemons.
- `/pokemonsummary:` Shows a brief explanation of your pokemons.
- `/deleteaccount:` Delete your account from PokeBotShowdown
- `/evolve:` Evolve your pokemon once it reachs certain limit
- `/help:` Show all commands

All commands are case sensitive and must start with `/`. To see more commands, type `/help` or check `/src/shared/commands.ts`
