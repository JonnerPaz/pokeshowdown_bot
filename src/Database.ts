import { MongoClient } from 'mongodb'
import { UserSchema } from './types'

class Database {
  private client: MongoClient
  private password = process.env.DATABASE_PASSWORD
  private uri = `mongodb+srv://jonnerpazp:${this.password}@pokebotcluster.kgeb0ma.mongodb.net/?retryWrites=true&w=majority&appName=pokebotcluster`

  constructor() {
    this.client = new MongoClient(this.uri)
  }

  private async connect() {
    try {
      return await this.client.connect()
    } catch (err) {
      console.error(err)
    }
  }

  private async close() {
    try {
      return await this.client.close()
    } catch (err) {
      console.error(err)
    }
  }

  /** 
   return data will output in a console
    */
  async listDB() {
    try {
      await this.connect()
      const dbs = await this.client.db().admin().listDatabases()
      console.log(dbs.databases)
      await this.close()
    } catch (err) {
      throw err
    }
  }

  async addUser(user: UserSchema) {
    try {
      this.connect()
      const newUser = await this.client
        .db('pokebot-db')
        .collection('users')
        .insertOne(user)
      console.log('new id: ', newUser)
      this.close()
    } catch (err) {
      throw err
    }
  }
}

export const db = new Database()
