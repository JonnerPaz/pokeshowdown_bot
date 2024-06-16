import { IUser, PokemonRegistered, UserRegistered } from '../types'
import { Schema, model, connect } from 'mongoose'

const userSchema = new Schema<IUser>({
  userName: String,
  pokemonParty: Array,
})

export const mongoUser = model<IUser>('Users', userSchema)

async function run() {
  await connect(
    `mongodb+srv://jonner:${process.env.DATABASE_PASSWORD}@pokebotcluster.kgeb0ma.mongodb.net/?retryWrites=true&w=majority&appName=pokebotcluster`
  )
}
