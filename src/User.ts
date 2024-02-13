import { Bot } from "grammy";

interface RegisteredUser {
  userName: string,
  pokemon: object[],
}

export class User {
  private id: number
  private user: string
  private data: RegisteredUser

  constructor(user: string, id: number) {
    this.user = user
    this.id = id

    // creates initial data of a given user
    this.data = {
      userName: this.user,
      pokemon: [{}]
    }
  }

  get getData() {
    return this.data
  }

  /**
   *
   * returns ID
   * @param get id */
  get getID() {
    return this.id
  }

  start(bot: Bot) {
    const welcomeMessage = `Bienvenido a PokeBotShowdown. Bot creado para capturar, intercambiar y combatir con pokemones`;
    bot.command("start", res => res.reply("Bienvenido a PokeBotShowDown"));
  }

  catchPokemon() { }

  viewPokemon() { }

  tradePokemon() { }
}
