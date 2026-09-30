import { Composer, InlineQueryResultBuilder } from "grammy";
import type { AppContext } from "../../presentation/data/types.js";
import type { PokeApiService } from "../../presentation/services/pokeapi.service.js";
import type { UserDataSource } from "../../domain/datasource/user.datasource.js";
import {
  formatInlinePokedexCard,
  formatInlineBuddyCard,
  formatInlineTeamCard,
} from "./inline.service.js";
import { getPokemonLevel } from "../pokemon/pokemon.service.js";

export interface InlineFeatureDeps {
  pokeApi: PokeApiService;
  userDataSource: UserDataSource;
}

export function createInlineFeature(deps: InlineFeatureDeps): Composer<AppContext> {
  const feature = new Composer<AppContext>();

  feature.on("inline_query", async (ctx) => {
    const rawQuery = ctx.inlineQuery.query.trim();
    const query = rawQuery.toLowerCase();
    const userId = ctx.from.id;

    // 1. Buddy Query: @bot buddy / @bot companero
    if (query === "buddy" || query === "companero") {
      const user = await deps.userDataSource.findUserByTelegramId(userId);

      if (!user) {
        await ctx.answerInlineQuery(
          [
            InlineQueryResultBuilder.article(
              "unregistered_buddy",
              "⚠️ You are not registered yet!",
              {
                description: "Start your adventure with @PokeShowdownBot first.",
              },
            ).text(
              "Please open @PokeShowdownBot and use /register to choose your starter Pokémon!",
            ),
          ],
          { cache_time: 10, is_personal: true },
        );
        return;
      }

      const buddy = user.pokemons.find((p) => p.id === user.buddyPokemonId);
      if (!buddy) {
        await ctx.answerInlineQuery(
          [
            InlineQueryResultBuilder.article("no_buddy", "⭐ No Companion Buddy Selected", {
              description: "Use /buddy inside the bot to set your active companion.",
            }).text(
              "You don't have an active companion buddy yet! Use /buddy in chat to pick your favorite Pokémon.",
            ),
          ],
          { cache_time: 10, is_personal: true },
        );
        return;
      }

      const photoUrl =
        buddy.sprites.frontDefault ||
        buddy.sprites.frontShiny ||
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png";

      const cardText = formatInlineBuddyCard(user, buddy);
      const title = `⭐ ${buddy.nickname ?? buddy.name.toUpperCase()} (Lv. ${getPokemonLevel(buddy.timesCaught)})`;

      await ctx.answerInlineQuery(
        [
          InlineQueryResultBuilder.photo(`buddy_${buddy.id}`, photoUrl, {
            title,
            description: `${user.username}'s active companion buddy`,
            caption: cardText,
            parse_mode: "Markdown",
          }),
        ],
        { cache_time: 10, is_personal: true },
      );
      return;
    }

    // 2. Team / Party Query: @bot team / @bot party / @bot equipo
    if (query === "team" || query === "party" || query === "equipo") {
      const user = await deps.userDataSource.findUserByTelegramId(userId);

      if (!user) {
        await ctx.answerInlineQuery(
          [
            InlineQueryResultBuilder.article(
              "unregistered_team",
              "⚠️ You are not registered yet!",
              {
                description: "Start your adventure with @PokeShowdownBot first.",
              },
            ).text(
              "Please open @PokeShowdownBot and use /register to choose your starter Pokémon!",
            ),
          ],
          { cache_time: 10, is_personal: true },
        );
        return;
      }

      const teamCard = formatInlineTeamCard(user);
      await ctx.answerInlineQuery(
        [
          InlineQueryResultBuilder.article(
            `team_${userId}`,
            `🎒 ${user.username}'s Pokémon Party`,
            {
              description: `View full roster (${user.pokemons.length} Pokémon owned)`,
            },
          ).text(teamCard, { parse_mode: "Markdown" }),
        ],
        { cache_time: 10, is_personal: true },
      );
      return;
    }

    // 3. Search Pokédex by Pokémon name or national ID: @bot <pokemon>
    if (query.length > 0) {
      try {
        const entry = await deps.pokeApi.getPokedexEntry(query);
        if (entry) {
          const cardText = formatInlinePokedexCard(entry);
          const title = `#${entry.id} ${entry.name.charAt(0).toUpperCase() + entry.name.slice(1)}`;
          const description = `${entry.types.join(", ")} | Ability: ${entry.ability}`;

          if (entry.spriteUrl) {
            await ctx.answerInlineQuery(
              [
                InlineQueryResultBuilder.photo(`pkdx_${entry.id}`, entry.spriteUrl, {
                  title,
                  description,
                  caption: cardText,
                  parse_mode: "Markdown",
                }),
              ],
              { cache_time: 300 },
            );
          } else {
            await ctx.answerInlineQuery(
              [
                InlineQueryResultBuilder.article(`pkdx_${entry.id}`, title, {
                  description,
                }).text(cardText, { parse_mode: "Markdown" }),
              ],
              { cache_time: 300 },
            );
          }
          return;
        }
      } catch {
        // Fallback to not found
      }

      // No entry found
      await ctx.answerInlineQuery(
        [
          InlineQueryResultBuilder.article("not_found", `🔍 No Pokémon found for "${rawQuery}"`, {
            description: "Try searching by exact name (e.g. 'pikachu') or national ID (e.g. '25').",
          }).text(
            `Could not find a Pokémon matching "*${rawQuery}*".\nTry searching for names like \`pikachu\`, \`charizard\`, or ID numbers like \`25\`.`,
            { parse_mode: "Markdown" },
          ),
        ],
        { cache_time: 60 },
      );
      return;
    }

    // 4. Empty Query: Show guide and quick shortcuts
    const user = await deps.userDataSource.findUserByTelegramId(userId);
    const results = [];

    if (user && user.buddyPokemonId) {
      const buddy = user.pokemons.find((p) => p.id === user.buddyPokemonId);
      if (buddy) {
        const photoUrl =
          buddy.sprites.frontDefault ||
          buddy.sprites.frontShiny ||
          "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png";
        results.push(
          InlineQueryResultBuilder.photo(`quick_buddy_${buddy.id}`, photoUrl, {
            title: `⭐ Share Companion: ${buddy.nickname ?? buddy.name.toUpperCase()}`,
            description: `Lv. ${getPokemonLevel(buddy.timesCaught)} • Tap to share into chat`,
            caption: formatInlineBuddyCard(user, buddy),
            parse_mode: "Markdown",
          }),
        );
      }
    }

    if (user) {
      results.push(
        InlineQueryResultBuilder.article(
          "quick_team",
          `🎒 Share Party (${user.pokemons.length} Pokémon)`,
          {
            description: "Tap to share your Pokémon roster in this chat",
          },
        ).text(formatInlineTeamCard(user), { parse_mode: "Markdown" }),
      );
    }

    results.push(
      InlineQueryResultBuilder.article("guide_search", "🔍 Search Any Pokémon in Pokédex", {
        description: "Type '@PokeShowdownBot <name>' (e.g. @PokeShowdownBot pikachu)",
      }).text(
        "💡 *How to use Pokédex Inline Search:*\n\nType `@PokeShowdownBot <name>` in any chat to preview and share stats!\n\nExamples:\n• `@PokeShowdownBot pikachu`\n• `@PokeShowdownBot charizard`\n• `@PokeShowdownBot buddy`",
        { parse_mode: "Markdown" },
      ),
    );

    await ctx.answerInlineQuery(results, { cache_time: 10, is_personal: true });
  });

  return feature;
}
