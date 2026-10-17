export const TYPE_BADGES: Record<string, string> = {
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

/** Renders a list of type names as decorated badges (e.g. `🔥 Fire / 🦅 Flying`). */
export function formatTypeBadges(types: string[]): string {
  return types.map((type) => TYPE_BADGES[type.toLowerCase()] ?? type).join(" / ");
}

/**
 * Renders a single stat as a fixed-width bar plus its numeric value.
 * Bars are clamped to 1..10 so even a zero stat shows a sliver.
 */
export function renderStat(name: string, value: number, max = 150): string {
  const bars = Math.min(10, Math.max(1, Math.round((value / max) * 10)));
  const filled = "█".repeat(bars);
  const empty = "░".repeat(10 - bars);
  return `${name.padEnd(7)} ${filled}${empty} ${String(value).padStart(3, " ")}`;
}
