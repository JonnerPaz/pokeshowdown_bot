import { InlineKeyboard, InputMediaBuilder } from "grammy";
import type { InputMediaPhoto } from "grammy/types";
import type { PokemonEntity } from "../../domain/entities/pokemon.entity.js";

export function createStarterKeyboard(
  pokemons: PokemonEntity[],
): [InputMediaPhoto[], InlineKeyboard] {
  const photos = pokemons.map((el) => InputMediaBuilder.photo(el.sprites.frontDefault));

  const keyboard = new InlineKeyboard()
    .text(pokemons[0]?.name ?? "Starter 1", "starter0")
    .text(pokemons[1]?.name ?? "Starter 2", "starter1")
    .text(pokemons[2]?.name ?? "Starter 3", "starter2")
    .text("Cancel", "starterCancel");

  return [photos, keyboard];
}

export function createDeleteAccountKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text("Yes", "delete-account").text("No", "delete-cancelled");
}
