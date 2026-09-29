import type { UserEntity } from "../../domain/entities/users.entity.js";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";

export function getTrainerRankTitle(wins: number): string {
  if (wins >= 50) return "👑 Champion";
  if (wins >= 25) return "⭐ Pokémon Master";
  if (wins >= 10) return "🥇 Ace Trainer";
  if (wins >= 3) return "🥈 Gym Challenger";
  return "🥉 Rookie Trainer";
}

export function calculateWinRate(wins: number, losses: number): number {
  const total = wins + losses;
  if (total === 0) return 0;
  return Number(((wins / total) * 100).toFixed(1));
}

export function getBuddyPokemon(user: UserEntity): PokemonEntity | null {
  if (user.buddyPokemonId !== null && user.buddyPokemonId !== undefined) {
    const found = user.pokemons.find((p) => p.id === user.buddyPokemonId);
    if (found) return found;
  }
  return user.pokemons[0] ?? null;
}

export function formatProfileCard(user: UserEntity): { text: string; spriteUrl?: string } {
  const title = getTrainerRankTitle(user.wins);
  const totalBattles = user.wins + user.losses;
  const winRate = calculateWinRate(user.wins, user.losses);

  const uniqueCount = new Set(user.pokemons.map((p) => p.name.toLowerCase())).size;
  const shinyCount = user.pokemons.filter((p) => p.isShiny).length;
  const buddy = getBuddyPokemon(user);

  let buddySection = "_No buddy Pokémon assigned._ (Set one with /buddy <name>)";
  let spriteUrl: string | undefined;

  if (buddy) {
    const buddyName = buddy.nickname ? `${buddy.nickname} (${buddy.name})` : buddy.name;
    const buddyLevel = Math.min(100, 20 + buddy.timesCaught * 5);
    const shinyMarker = buddy.isShiny ? " ✨" : "";
    buddySection = `⭐ *Buddy:* ${buddyName}${shinyMarker}\nLevel ${buddyLevel} • Caught ${buddy.timesCaught}x`;
    spriteUrl = buddy.isShiny ? buddy.sprites.frontShiny : buddy.sprites.frontDefault;
  }

  const text =
    `🪪 *Trainer Card* — @${user.username}\n` +
    `${title}\n\n` +
    `⚔️ *Battle Record:*\n` +
    `• Total Battles: ${totalBattles}\n` +
    `• Record: ${user.wins}W - ${user.losses}L\n` +
    `• Win Rate: ${winRate}%\n\n` +
    `🎒 *Collection:*\n` +
    `• Owned: ${user.pokemons.length} (${uniqueCount} unique)\n` +
    `• Shinies: ${shinyCount} ✨\n\n` +
    `${buddySection}`;

  return {
    text,
    ...(spriteUrl ? { spriteUrl } : {}),
  };
}

export function formatLeaderboard(
  topUsers: UserEntity[],
  callerTelegramId?: number | bigint,
): string {
  if (topUsers.length === 0) {
    return (
      `🏆 *ShowdownBot Battle Leaderboard* 🏆\n\n` +
      `No battles recorded yet! Challenge a friend with /battle to claim the #1 spot!`
    );
  }

  const medals = ["🥇", "🥈", "🥉"];
  const lines: string[] = [];

  topUsers.forEach((u, index) => {
    const rankLabel = medals[index] ?? `${index + 1}.`;
    const winRate = calculateWinRate(u.wins, u.losses);
    const buddy = getBuddyPokemon(u);
    const buddyStr = buddy ? ` • ${buddy.name}${buddy.isShiny ? " ✨" : ""}` : "";
    lines.push(
      `${rankLabel} *@${u.username}* — ${u.wins}W / ${u.losses}L (${winRate}% WR)${buddyStr}`,
    );
  });

  let footer = "";
  if (callerTelegramId !== undefined) {
    const callerRank = topUsers.findIndex(
      (u) => u.telegramId !== null && BigInt(u.telegramId) === BigInt(callerTelegramId),
    );
    if (callerRank !== -1) {
      footer = `\n\n📍 *Your Position:* #${callerRank + 1} (@${topUsers[callerRank]?.username})`;
    }
  }

  return (
    `🏆 *ShowdownBot Battle Leaderboard* 🏆\n` +
    `Top trainers ranked by battle victories:\n\n` +
    lines.join("\n") +
    footer
  );
}

export function findPokemonForBuddy(
  user: UserEntity,
  query: string,
): { found: PokemonEntity } | { error: string } {
  const clean = query.trim().toLowerCase();
  if (!clean) {
    return { error: "Please provide the name or nickname of the Pokémon you want as buddy!" };
  }

  const match = user.pokemons.find(
    (p) => p.name.toLowerCase() === clean || (p.nickname && p.nickname.toLowerCase() === clean),
  );

  if (!match) {
    return { error: `You don't own any Pokémon named "${query}". Check your /pokemons bag!` };
  }

  return { found: match };
}
