import { Collection, Document, MongoClient } from 'mongodb'
import { User } from './User'

class Mongo {
  private client: MongoClient
  private password = process.env.DATABASE_PASSWORD
  private uri = `mongodb+srv://jonnerpazp:${this.password}@pokebotcluster.kgeb0ma.mongodb.net/?retryWrites=true&w=majority&appName=pokebotcluster`
  private usersCollection: Collection<Document>

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
      console.log(dbs.databases)
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
      const newUser = await this.usersCollection.insertOne(user)
      newUser.insertedId = user.console.log('new id: ', newUser)
      await this.client.close()
    } catch (err) {
      throw err
    }
  }

  async findOneUser() {
    try {
      await this.client.connect()
    } catch (err) {
      console.error(err)
    }
  }
}

const db = new Mongo()

export default db
