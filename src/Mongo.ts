import { Collection, MongoClient } from 'mongodb'
import { User } from './User'
import 'dotenv/config'
import { PokemonRegistered, UserRegistered } from './types'

class Mongo {
  private client: MongoClient
  private password = process.env.DATABASE_PASSWORD
  private uri = `mongodb+srv://jonner:${this.password}@pokebotcluster.kgeb0ma.mongodb.net/?retryWrites=true&w=majority&appName=pokebotcluster`
  private usersCollection: Collection<UserRegistered>

  constructor() {
    this.client = new MongoClient(this.uri)
    this.usersCollection = this.client.db('pokebot-db').collection('users')
  }

  /** 
   @returns Data outputted will be printed on console
    */
  async listDB() {
    try {
      await this.client.connect()
      const dbs = await this.client.db().admin().listDatabases()
      console.log(dbs)
      await this.client.close()
    } catch (err) {
      throw err
    }
  }

  /**
   @param user {UserSchema} Must insert a User
   */
  async addUser(user: User) {
    try {
      await this.client.connect()
      const query = await this.findOneUser(user.userName)
      if (query) return null // if user already created
      await this.usersCollection.insertOne(user)
      await this.client.close()
    } catch (err) {
      throw err
    }
  }

  /**
    @param user {string} User's userName
    @returns a user from Mongo
   */
  async findOneUser(user: string) {
    try {
      await this.client.connect()
      const query = { userName: user }
      const result = await this.usersCollection.findOne(query)
      if (!result) return null
      return result
    } catch (err) {
      console.error(err)
    }
  }

  async updatePokemonCount(
    byUser: UserRegistered,
    updatePokemonCount: [string, number]
  ) {
    await this.client.connect()
    const pokemonName = updatePokemonCount[0]
    await this.usersCollection.updateOne(
      { userName: byUser.userName, 'pokemonParty.name': pokemonName },
      {
        $inc: {
          'pokemonParty.$.counter': 1,
        },
      }
    )
  }

  async evolvePokemon(
    byUser: UserRegistered,
    oldPokemon: PokemonRegistered,
    newPokemon: PokemonRegistered
  ) {
    try {
      const args = [byUser, oldPokemon, newPokemon].some((el) => el === null)
      if (args) return new Error('args from evolve Pokemon includes null')

      const userDB = this.findOneUser(byUser.userName)
      if (!userDB) return new Error('No user found')
      const poki = { ...newPokemon }

      await this.usersCollection.updateOne(
        { userName: byUser.userName, 'pokemonParty.name': oldPokemon.name },
        {
          $set: {
            'pokemonParty.$': poki,
          },
        }
      )
    } catch (error) {}
  }

  async updateUser() {}

  async deleteUser(byUserName: string) {
    try {
      // no need to call connect and close from mongodb api
      // these are being used from findOneUser
      const user = (await this.findOneUser(byUserName)) ?? null
      if (!user) return new Error('No user found')
      const result = (await this.usersCollection.deleteOne(user)) ?? null
      return result
    } catch (error) {
      console.error(error)
    }
  }
}

const mongo = new Mongo()

export default mongo
