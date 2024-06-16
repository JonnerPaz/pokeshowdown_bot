import { mongoUser } from './Schema'
import mongoose from 'mongoose'

class Mongoose {
  private password = process.env.DATABASE_PASSWORD
  private uri = `mongodb+srv://jonner:${this.password}@pokebotcluster.kgeb0ma.mongodb.net/?retryWrites=true&w=majority&appName=pokebotcluster`

  async connect() {
    return await mongoose.connect(this.uri)
  }
}
