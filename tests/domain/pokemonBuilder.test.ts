import { describe, it, expect } from "vitest";
import { PokemonBuilder } from "../../src/domain/entities/PokemonBuilder.entity.js";

describe("PokemonBuilder", () => {
  const sampleSprites = {
    frontDefault: "https://example.com/front.png",
    backDefault: "https://example.com/back.png",
    frontShiny: "https://example.com/front-shiny.png",
    backShiny: "https://example.com/back-shiny.png",
  };

  it("should build a valid PokemonEntity", () => {
    const builder = new PokemonBuilder();
    const pokemon = builder
      .setName("bulbasaur")
      .setTypes(["grass", "poison"])
      .setAbility("overgrow")
      .setShiny(true)
      .setSprite(sampleSprites)
      .setTimesCaught(3)
      .build();

    expect(pokemon.name).toBe("bulbasaur");
    expect(pokemon.types).toEqual(["grass", "poison"]);
    expect(pokemon.ability).toBe("overgrow");
    expect(pokemon.isShiny).toBe(true);
    expect(pokemon.timesCaught).toBe(3);
  });

  it("should throw if name is missing", () => {
    const builder = new PokemonBuilder();
    builder.setTypes(["fire"]).setAbility("blaze").setSprite(sampleSprites);

    expect(() => builder.build()).toThrow("Name is required");
  });

  it("should throw if ability is missing", () => {
    const builder = new PokemonBuilder();
    builder.setName("charmander").setTypes(["fire"]).setSprite(sampleSprites);

    expect(() => builder.build()).toThrow("Ability is required");
  });
});
