# PokeBotShowdown - A telegram bot to catch pokemon and play against your friends

## Inspiration

I played long ago pokemon showdown and I find fun to build this bot now that I know one thing or two about programming. Besides, telegram is the chat app that I use the most. 

## How to use it

Once you invite your bot to a group, it will start to listen every message that is sent to the chat. Once the number of messages hits a certain limit, it will send a pokemon to the group with an inline keyboard with the label 'catch'. Whoever that selects that button, it will

## How to run it locally

> [!WARNING]
> Remember: A .env file should not be shared with ANYONE.

If you want to run your own instance of this bot, first you need a token from telegram. Contact [@BotFather](https://telegram.me/BotFather) in telegram. Once you start a chat with him, follow this steps:
    1. Use /newbot command 
    2. Select a name for your bot (try to use showdown in the name. It is not mandatory but it will make my happy)
    3. Select a unique username for your bot. Once completed, BotFather will give you your new token. 

Now, create a file called '.env' with these options:
    - API_KEY: The token that [@BotFather](https://telegram.me/BotFather) gives you.
    - DATABASE: A mongodb instance, with its username and password (remember this .env file MUST be private and no one can see it).
    - DATABASE_COLLECTION (optional): If given argument, the bot will use that collection to store its users. By default uses 'users' collection
    - Resource: URL where webhooks are handled
    - AUTHOR: Author of the bot. Mine is used by default, but you can leave yours

To easily run this bot using polling, first install the project's dependencies and uncomment a code block in `src/index.ts`, and comment the part that should be commented in the same file, and run `npm test` in the terminal.  

To run this bot using webhooks locally, you must use a website that supports webhooks. I use [localhost.run](https://localhost.run/) when testing the bot locally.
### commands

- /start = Starts a chat with PokeBotShowdown. Gives general information about him and the commands you can use.
- /register: Register a user into the bot. Note that if you're not registered into the bot
- /pokemongenerate: Generate random pokemons (in private chats by default)
- /pokemonsummary: Shows a brief explanation of each pokemon the user has.
- /deleteaccount: Delete your account from PokeBotShowdown
- /evolve: Evolve your pokemon once it reachs certain limit
- /help: Show all commands

### Comming Soon Updates...

The following is a chronological list of the changes planned to the bot in the near future. I'm only one person building the bot, so I don't know how long it will take to accomplish all the tasks listed here.

- Add better error catching for the bot
- Add /evolverandom: evolve your pokemon to a random pokemon! (because why not?)
- Refactor: Switch codebase from mongodb driver to use the mongoose library
- Refactor: /pokemonsummary update to display moves, abilities, better layout and display how many times you've captured that pokemon
- Add the option for other developers to start using telegrams sessions, so the developer will decide what to use, whether it is sessions or mongodb
- Add /battle: Links a player to start a battle against a trainer
- Add /pokeleaderboard: Display a leaderboard of user wins in battles.
