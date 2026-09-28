import { describe, it, expect } from "vitest";
import { PokemonEntity } from "../../src/domain/entities/pokemon.entity.js";

describe("PokemonEntity", () => {
  const sampleSprites = {
    frontDefault: "https://example.com/front.png",
    backDefault: "https://example.com/back.png",
    frontShiny: "https://example.com/front-shiny.png",
    backShiny: "https://example.com/back-shiny.png",
  };

  it("should create a valid entity from object", () => {
    const pokemon = PokemonEntity.fromObject({
      name: "pikachu",
      types: ["electric"],
      ability: "static",
      sprites: sampleSprites,
      timesCaught: 1,
    });

    expect(pokemon.name).toBe("pikachu");
    expect(pokemon.types).toEqual(["electric"]);
    expect(pokemon.ability).toBe("static");
    expect(pokemon.isShiny).toBe(false);
    expect(pokemon.timesCaught).toBe(1);
  });

  it("should throw when required fields are missing", () => {
    expect(() =>
      PokemonEntity.fromObject({
        types: ["electric"],
        ability: "static",
        sprites: sampleSprites,
      }),
    ).toThrow();
  });

  describe("spendForShiny", () => {
    it("should convert a non-shiny pokemon to shiny and deduct catches", () => {
      const pokemon = PokemonEntity.fromObject({
        name: "charmander",
        types: ["fire"],
        ability: "blaze",
        sprites: sampleSprites,
        timesCaught: 5,
        isShiny: false,
      });

      const shiny = pokemon.spendForShiny(3);

      expect(shiny.isShiny).toBe(true);
      expect(shiny.timesCaught).toBe(2);
      expect(shiny.name).toBe("charmander");
    });

    it("should throw if the pokemon is already shiny", () => {
      const shinyPokemon = PokemonEntity.fromObject({
        name: "charmander",
        types: ["fire"],
        ability: "blaze",
        sprites: sampleSprites,
        timesCaught: 5,
        isShiny: true,
      });

      expect(() => shinyPokemon.spendForShiny(3)).toThrow("already shiny");
    });

    it("should throw if timesCaught is less than cap", () => {
      const pokemon = PokemonEntity.fromObject({
        name: "charmander",
        types: ["fire"],
        ability: "blaze",
        sprites: sampleSprites,
        timesCaught: 2,
        isShiny: false,
      });

      expect(() => pokemon.spendForShiny(3)).toThrow("at least 3 catches");
    });
  });
});
