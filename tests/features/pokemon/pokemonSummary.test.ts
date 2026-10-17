import { describe, expect, it } from "vitest";
import { createMockPokemon } from "../../harness/testHarness.js";
import {
  buildPokemonSummaryCaption,
  getPokemonLevel,
} from "../../../src/features/pokemon/pokemon.service.js";

const BASE_STATS = {
  hp: 35,
  attack: 55,
  defense: 40,
  specialAttack: 50,
  specialDefense: 50,
  speed: 90,
};

describe("pokemon summary formatting", () => {
  it("caps the derived battle level at 100", () => {
    expect(getPokemonLevel(1)).toBe(25);
    expect(getPokemonLevel(3)).toBe(35);
    expect(getPokemonLevel(100)).toBe(100);
  });

  it("escapes markdown in names and nicknames and totals base stats", () => {
    const pokemon = createMockPokemon("mr-mime", "psychic", { nickname: "Mr_Mime*" });
    const caption = buildPokemonSummaryCaption(pokemon, BASE_STATS);

    expect(caption).toContain("*Nickname:* Mr\\_Mime\\*");
    expect(caption).toContain("*Name:* MR-MIME");
    expect(caption).toContain("*Total:* 320");
  });

  it("renders a placeholder nickname when none is set", () => {
    const pokemon = createMockPokemon("eevee", "normal");
    const caption = buildPokemonSummaryCaption(pokemon, BASE_STATS);

    expect(caption).toContain("*Nickname:* None");
  });
});
