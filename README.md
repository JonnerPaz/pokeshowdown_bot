# PokeBotShowdown - A telegram bot to catch and trade pokemon with your friends!

## 🌟 Inspiration

I played long ago pokemon showdown and I find fun to build this bot now that I know one thing or two about programming. Besides, telegram is the chat app that I use the most. 

I want to build fun stuff and that's it.

## 📚 How to use it

Once you invite your bot to a group, it will start to listen every message that is sent to the chat. Once the number of messages hits a certain limit, it will send a pokemon to the group with an inline keyboard with the label 'catch'. Whoever that selects that button, it will

## 🚀 How to run it locally

> [!WARNING]
> This file mentions some configurations that, in case you decide to run your own instance of this bot, you CAN'T share with anyone, including your bot token, the database password, nor any data that goes inside the .env file.
> For security purposes, keep this to yourself.

If you want to run your own instance of this bot, first you need a token from telegram. Contact [@BotFather](https://telegram.me/BotFather) in telegram and start a chat with him. Then, follow this steps:

1. Use the `/newbot` command 
2. Select a name for your bot (try to use showdown in the name. It is not mandatory but it will make my happy)
3. Select a unique username for your bot. Once completed, BotFather will give you your new token. 

Now, create a file with the name `.env`  with these options:
- **API_KEY:** The token that [@BotFather](https://telegram.me/BotFather) gives you.
- **DATABASE:** A mongodb instance, with its username and password (remember this `.env` file MUST be private and no one can see it).
- **DATABASE_COLLECTION *(optional)*:** If given argument, the bot will use that collection to store its users. By default uses `users` collection
- **Resource:** URL where webhooks are handled
- **AUTHOR:** Author of the bot. Mine is used by default, but you can leave yours

To easily run this bot using polling, first install the project's dependencies and uncomment a code block in `src/index.ts`, and comment the part as indicated in that file, and run `npm test` in the terminal. Make sure to know the [differences between long polling and webhooks](https://grammy.dev/guide/deployment-types) (for testing, polling is better and easier to set up).

To run this bot using webhooks, you must use a website that supports webhooks. I use [localhost.run](https://localhost.run/) when testing the bot locally.

## 👤 commands

- `/start:` Starts a chat with PokeBotShowdown. Gives general information about him and the commands you can use.
- `/register:` Register a user into the bot. Note that if you're not registered into the bot
- `/pokemongenerate:` Generate random pokemons (in private chats by default)
- `/pokemonsummary:` Shows a brief explanation of each pokemon the user has.
- `/deleteaccount:` Delete your account from PokeBotShowdown
- `/evolve:` Evolve your pokemon once it reachs certain limit
- `/help:` Show all commands

## 💪 Comming Soon Updates...

The following is a chronological list of the changes planned to the bot in the near future. I'm only one person building the bot, so I don't know how long it will take to accomplish all the tasks listed here.

- Add better error catching for the bot
- Add `/evolverandom`: evolve your pokemon to a random pokemon! (because why not?)
- Refactor: Switch codebase from mongodb driver to use the mongoose library
- Refactor: `/pokemonsummary` update to display moves, abilities, better layout and display how many times you've captured that pokemon
- Add the option for other developers to start using telegrams sessions, so the developer will decide what to use, whether it is sessions or mongodb
- Add `/battle:` Links a player to start a battle against a trainer
- Add `/pokeleaderboard:` Display a leaderboard of user wins in battles.

## Contributions

For now I do not accept pull requests, but they will be soon. 

If you use this bot, find an issue and you would like to help, please report it here! 
