import type { AppContext, AppConversation } from "../../presentation/data/types.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import { CONVERSATION_TIMEOUT_MS } from "../../domain/data/constants.js";

export interface PokedexConversationDeps {
  pokeApi: PokeApiService;
  userDataSource: UserDataSource;
}

const TYPE_BADGES: Record<string, string> = {
  normal: "⚪ Normal",
  fire: "🔥 Fire",
  water: "💧 Water",
  electric: "⚡ Electric",
  grass: "🌿 Grass",
  ice: "❄️ Ice",
  fighting: "🥊 Fighting",
  poison: "☠️ Poison",
  ground: "🏜️ Ground",
  flying: "🦅 Flying",
  psychic: "🔮 Psychic",
  bug: "🐛 Bug",
  rock: "🪨 Rock",
  ghost: "👻 Ghost",
  dragon: "🐉 Dragon",
  steel: "⚙️ Steel",
  fairy: "✨ Fairy",
  dark: "🌑 Dark",
};

function renderStat(name: string, value: number, max = 150): string {
  const bars = Math.min(10, Math.max(1, Math.round((value / max) * 10)));
  const filled = "█".repeat(bars);
  const empty = "░".repeat(10 - bars);
  return `${name.padEnd(7)} ${filled}${empty} ${String(value).padStart(3, " ")}`;
}

export async function pokedexConversation(
  conv: AppConversation,
  ctx: AppContext,
  deps: PokedexConversationDeps,
) {
  const rawText = ctx.message?.text ?? "";
  const parts = rawText.split(/\s+/).slice(1);
  let target = parts.join(" ").trim();

  if (!target) {
    await ctx.reply("Which Pokemon do you want to look up? Send its name or Pokédex number:");
    const answer = await conv
      .waitFrom(ctx.from!.id, { maxMilliseconds: CONVERSATION_TIMEOUT_MS })
      .andFor(":text");
    target = answer.message?.text?.trim() ?? "";
  }

  if (!target) {
    await ctx.reply("Pokédex search cancelled.");
    return;
  }

  const entry = await conv.external(() => deps.pokeApi.getPokedexEntry(target));
  if (!entry) {
    await ctx.reply(
      `❌ Could not find Pokédex data for "${target}". Check the spelling and try again!`,
    );
    return;
  }

  const user = await conv.external(() => deps.userDataSource.findUserByTelegramId(ctx.from!.id));
  const owned = user?.pokemons.find((p) => p.name.toLowerCase() === entry.name.toLowerCase());
  const ownedStatus = owned
    ? `✅ In your bag (Caught: ${owned.timesCaught}x${owned.isShiny ? " ✨Shiny" : ""})`
    : "⚪ Not yet in your collection";

  const formattedTypes = entry.types.map((t) => TYPE_BADGES[t.toLowerCase()] ?? t).join(" / ");

  const totalStats =
    entry.stats.hp +
    entry.stats.attack +
    entry.stats.defense +
    entry.stats.specialAttack +
    entry.stats.specialDefense +
    entry.stats.speed;

  const caption = [
    `📖 *Pokédex Entry #${String(entry.id).padStart(3, "0")}*`,
    `*${entry.name.toUpperCase()}*`,
    `*Type:* ${formattedTypes}`,
    `*Height:* ${entry.heightM.toFixed(1)}m | *Weight:* ${entry.weightKg.toFixed(1)}kg`,
    `*Ability:* ${entry.ability}`,
    "",
    `*Status:* ${ownedStatus}`,
    "",
    `_"${entry.flavorText}"_`,
    "",
    "📊 *Base Stats:*",
    `\`${renderStat("HP", entry.stats.hp)}\``,
    `\`${renderStat("Attack", entry.stats.attack)}\``,
    `\`${renderStat("Defense", entry.stats.defense)}\``,
    `\`${renderStat("Sp.Atk", entry.stats.specialAttack)}\``,
    `\`${renderStat("Sp.Def", entry.stats.specialDefense)}\``,
    `\`${renderStat("Speed", entry.stats.speed)}\``,
    `*Total:* ${totalStats}`,
  ].join("\n");

  try {
    if (entry.spriteUrl) {
      await ctx.api.sendPhoto(ctx.chat!.id, entry.spriteUrl, {
        caption,
        parse_mode: "Markdown",
      });
      return;
    }
  } catch {
    // photo delivery fallback
  }

  await ctx.reply(caption, { parse_mode: "Markdown" });
}
