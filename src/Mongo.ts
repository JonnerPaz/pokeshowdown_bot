import { Collection, MongoClient } from 'mongodb'
import { User } from './User'
import 'dotenv/config'
import { UserRegistered } from './types'

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
      if (query) return null
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
      this.client.close()
      return result
    } catch (err) {
      console.error(err)
    }
  }

  async updateUser() {}

  async deleteUser() {}
}

const mongo = new Mongo()

export default mongo
