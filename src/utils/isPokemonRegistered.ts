import { PokemonRegistered, grammyContext } from '../types'

/**
 * Verifies if given variable is typeof PokemonRegistered
 */
export const isPokemonRegistered = (
  pokemon: PokemonRegistered | null
): pokemon is PokemonRegistered => {
  return (pokemon as PokemonRegistered).name !== null
}
