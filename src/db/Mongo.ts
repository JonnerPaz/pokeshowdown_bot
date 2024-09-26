import { Collection, MongoClient } from 'mongodb'
import { User } from '../classes/User'
import { UserRegistered, PokemonRegistered } from '../types'
import 'dotenv/config'

class Mongo {
  private client: MongoClient
  private uri = process.env.DATABASE as string
  private usersCollection: Collection<UserRegistered>

  constructor() {
    this.client = new MongoClient(this.uri)
    this.usersCollection = this.client.db('pokebot-db').collection('users')
  }

  /**
   * @returns Array of user's registered pokemon
   * */
  async listDB() {
    try {
      const dbs = await this.client.db().admin().listDatabases()
      console.log(dbs)
    } catch (err) {
      throw err
    } finally {
      this.client.close()
    }
  }

  /**
   @param user {UserSchema} Must insert a User
   */
  async addUser(user: User) {
    try {
      await this.client.connect()
      const query = await this.findOneUser(user.userName)
      if (query) throw new Error('User is already created')
      await this.usersCollection.insertOne(user)
    } catch (err) {
      throw err
    }
  }

  /**
    @param byUserName {string} User's userName
    @returns a user from Mongo
    @description - This does not opens or closes the connection with mongodb
   */
  async findOneUser(byUserName: string) {
    try {
      await this.client.connect()
      const query = { userName: byUserName }
      const result = await this.usersCollection.findOne(query)
      if (!result) return null
      return result
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * push new pokemon to user' db
   * */
  async addPokemon(byUser: UserRegistered, pokemon: PokemonRegistered) {
    try {
      await this.client.connect()
      await this.usersCollection.updateOne(
        { userName: byUser.userName },
        { $push: { pokemonParty: pokemon } }
      )
    } catch (error) {
      throw error
    } finally {
      this.client.close()
    }
  }

  async deletePokemon(byUser: UserRegistered, pokemon: PokemonRegistered) {
    try {
      await this.client.connect()
      await this.usersCollection.updateOne(
        {
          userName: byUser.userName,
        },
        { $pull: { pokemonParty: pokemon } }
      )
    } catch (error) {
      throw error
    }
  }

  async updatePokemonCount(
    byUser: UserRegistered,
    updatePokemonCount: [string, number]
  ) {
    try {
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
    } catch (err) {
      throw err
    } finally {
      this.client.close()
    }
  }

  async evolvePokemon(
    byUser: UserRegistered,
    oldPokemon: PokemonRegistered,
    newPokemon: PokemonRegistered
  ) {
    try {
      this.client.connect()
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
    } catch (error) {
      console.error(error)
    } finally {
      this.client.close()
    }
  }

  async updateUser() {}

  async deleteUser(byUserName: string) {
    try {
      this.client.connect()
      const user = (await this.findOneUser(byUserName)) ?? null
      if (!user) return new Error('No user found')
      const result = (await this.usersCollection.deleteOne(user)) ?? null
      return result
    } catch (error) {
      console.error(error)
    } finally {
      this.client.close()
    }
  }
}

const mongo = new Mongo()

export default mongo
