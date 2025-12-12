import { ISpriteType } from './ISpriteType.dto.js'

export interface IPokemon {
  id: number
  types: string[]
  sprites: ISpriteType
  name: string
  ability: string
  timesCaught: number
}
