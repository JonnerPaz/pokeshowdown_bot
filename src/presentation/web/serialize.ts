import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { UserEntity } from "../../domain/entities/users.entity.js";

export interface SerializedPokemon {
  id: number | null;
  name: string;
  nickname?: string;
  types: string[];
  ability: string;
  isShiny: boolean;
  timesCaught: number;
  isInParty: boolean;
  sprites: {
    frontDefault: string;
    backDefault: string;
    frontShiny: string;
    backShiny: string;
  };
}

export interface SerializedUser {
  id: number | null;
  telegramId: string | null;
  username: string;
  createdAt: string;
  wins: number;
  losses: number;
  dailyStreak: number;
  buddyPokemonId: number | null;
  pokeballs: number;
  greatballs: number;
  ultraballs: number;
  masterballs: number;
}

export interface SerializedProfile {
  user: SerializedUser;
  party: SerializedPokemon[];
  botUsername: string | null;
}

export function serializePokemon(pokemon: PokemonEntity): SerializedPokemon {
  return {
    id: pokemon.id,
    name: pokemon.name,
    ...(pokemon.nickname ? { nickname: pokemon.nickname } : {}),
    types: [...pokemon.types],
    ability: pokemon.ability,
    isShiny: pokemon.isShiny,
    timesCaught: pokemon.timesCaught,
    isInParty: pokemon.isInParty,
    sprites: { ...pokemon.sprites },
  };
}

export function serializeUser(user: UserEntity): SerializedUser {
  return {
    id: user.id,
    // Telegram ids can exceed Number.MAX_SAFE_INTEGER; JSON cannot carry BigInt.
    telegramId: user.telegramId === null ? null : user.telegramId.toString(),
    username: user.username,
    createdAt: user.createdAt.toISOString(),
    wins: user.wins,
    losses: user.losses,
    dailyStreak: user.dailyStreak,
    buddyPokemonId: user.buddyPokemonId,
    pokeballs: user.pokeballs,
    greatballs: user.greatballs,
    ultraballs: user.ultraballs,
    masterballs: user.masterballs,
  };
}

export function serializeProfile(
  user: UserEntity,
  botUsername: string | null = null,
): SerializedProfile {
  return {
    user: serializeUser(user),
    party: user.party.map(serializePokemon),
    botUsername,
  };
}
