# PokeBotShowdown - A telegram bot to catch pokemon and play against your friends

## Structure

## index.ts

### commands

- start = Start a chat with PokeBotShowdown. Gives general information about him and following commands you can use and guide of use.
- catch = catch the pokemon that appears in the chat

## Structure

User - can use any of the options of the pokemon bot.
    * catchPokemon()
    * viewPokemon()
    * tradePokemon()
    * fight with other users (soon)
    * Generate pokemon

Pokemon - It should have the following stats
    * moves
    * abilites
    * Is it shiny or not? (show picture)
    * Evolve (if possible)

Control - It should both connect Pokemon and User class to work correctly
    * Generate pokemon in a given time once the bot is in the group
    * Catch 
    * Start the bot in the group
    * Stop the bot in the group
    * leaderboard of the players based on wins / loses (soon)

## Commands 

- pokebotStartBot: Starts the bot
- pokeBotStopBot: Stops the bot
- pokeBotGeneratePokemon: generates pokemon in a given time
- pokeBotPokemonSummary: Shows the stats of a given pokemon of the user
- pokeBotTradePokemon: links a player to start a trading process
- pokeBotBattleTrainer: Links a player to start a battle against a trainer
