# Gameplay

PokeBotShowdown brings collection, progression, trading, and battles into
Telegram. Most systems work in private chats; group chats add spontaneous wild
encounters and shared catching.

## Battle Arena

The Arena is the only battle system. Use `/battle` to create a room, then open
the Telegram Mini App to pick a Pokémon and fight. See [Mini App Arena](mini-app-arena.md)
for the full rules and API.

## Wild encounters and catching

### Solo encounters

`/generate_pokemon` creates a wild Pokémon in the current private chat. The
encounter lives in the conversation scope, so it is not shared with other
chats and does not leak into a global map.

When a Pokémon appears, choose a ball:

| Ball        | Catch multiplier | Notes                   |
| :---------- | :--------------- | :---------------------- |
| Pokéball    | 1.0×             | Standard ball.          |
| Great Ball  | 1.5×             | Improved catch rate.    |
| Ultra Ball  | 2.0×             | High-performance ball.  |
| Master Ball | Guaranteed       | Catches without a roll. |

Catch probability is derived from the species capture rate and the ball
multiplier, with a minimum chance and a guaranteed Master Ball. A failed throw
can let the Pokémon break free or flee, so encounters are a resource decision,
not a guaranteed catch.

### Group encounters

In group chats, activity can trigger a spontaneous spawn. The service watches
message counts, applies a random threshold, and enforces a cooldown so a busy
chat does not flood the channel.

- The spawn threshold is randomized between 20 and 40 messages.
- A group spawn has a 5-minute cooldown.
- Encounters expire after 2 minutes.
- The same sender cannot burst-spam the counter; repeated messages within a
  short window do not count normally.
- Multiple members can throw balls at the same encounter. An atomic reservation
  prevents two catches from spending the same attempt or double-resolving the
  Pokémon.
- A failed group catch has a chance to make the Pokémon flee; if it stays, other
  members can try.

## Pokéballs and daily rewards

`/bag` shows the current inventory: Pokéballs, Great Balls, Ultra Balls, and
Master Balls.

`/daily` grants a base reward and builds a streak:

- Base: 5 Pokéballs and 2 Great Balls.
- The claim cooldown is 20 hours.
- A streak continues when the next claim happens within 48 hours.
- Streak milestones add Ultra Balls, and longer milestones can add a Master Ball.

## Party, PC Box, and release

Your active party holds up to **6 Pokémon**. New catches fill the party first;
additional catches are routed to the PC Storage Box.

- `/pokemons` opens the interactive party carousel.
- `/box` opens PC storage and supports withdrawing, depositing, and swapping
  Pokémon between the party and the box.
- `/release` transfers a Pokémon to Professor Oak. The confirmation is
  irreversible.
  - Normal Pokémon: +3 Pokéballs.
  - Shiny Pokémon: +5 Pokéballs and +1 Great Ball.
  - The last remaining Pokémon cannot be released.

Party and box writes update the `isInParty` flag and keep the six-member limit
consistent.

## Pokédex

`/pokedex <name|id>` supports the national Pokédex from Generation 1 through
Generation 9 (up to 1025 species).

The lookup includes:

- Official artwork and species types.
- Pokédex lore/flavor text.
- Base stat visualization.
- An ownership indicator for the caller's collection.

## Trainer profile, leaderboard, and buddy

`/profile` renders a Trainer Card with:

- Username and rank title.
- Wins, losses, and win rate.
- Collection count.
- Active buddy sprite.
- Current party/collection context.

`/leaderboard` shows the top 10 trainers with podium medals and the caller's
position when they are outside the top 10.

`/buddy` selects a companion Pokémon. The buddy appears on the profile and in
inline cards. Evolution and trading keep buddy assignments consistent; a buddy
that evolves is migrated to the evolved Pokémon.

## Trading and evolution

### Trading

`/trade` starts a two-step player-to-player flow in a group chat. Trade buttons
are namespaced with a trade id, and confirmation buttons include the intended
trainer so a bystander cannot confirm someone else's trade.

The trade moves the selected Pokémon between trainers, preserves party limits,
and clears buddy assignments when the buddy is traded away.

### Evolution

`/evolve` evolves a Pokémon once it has been caught at least **3 times**
(`EVOLVE_CAP`). Evolution:

- Uses the species evolution chain through the PokéAPI service.
- Preserves shiny status.
- Merges an already-owned evolved form by stacking `timesCaught` instead of
  creating duplicate rows.
- Migrates a buddy assignment when the buddy evolves.

If a Pokémon has no further evolution, the bot reports that it cannot evolve.

## Shiny Pokémon and nicknames

- Random spawns can be shiny. The default odds are `1/512` and can be tuned with
  `SHINY_ODDS`.
- `/shiny` converts a qualified Pokémon into its shiny form. Qualification uses
  the same catch threshold as evolution.
- `/nickname` sets a custom display name. Nicknames appear in collection views
  and battle labels; Markdown-sensitive characters are escaped before sending.

## Inline mode

The bot supports Telegram inline queries from any chat:

- `@bot <pokemon>`: Pokédex preview card with artwork, types, and stats.
- `@bot buddy`: the caller's buddy, rank, and win rate.
- `@bot team`: the caller's active six-member party.

Inline responses are public to the chat where they are sent; avoid sharing
private trainer details in untrusted groups.

## Progression at a glance

- **Catch count** drives battle level: `min(100, 20 + timesCaught × 5)`.
- **Evolution** requires `timesCaught >= 3`.
- **Shiny conversion** uses the same threshold.
- **Ranked Arena wins** increment `wins`; losses increment `losses`; the winning
  Pokémon gains one `timesCaught` when the result is ranked.
- **Daily streaks** reward consistent play with additional ball tiers.
