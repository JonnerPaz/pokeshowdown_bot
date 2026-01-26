import { PokemonEntity } from "../../domain/entities/pokemon.entity.js";
import type { Sprites } from "../../domain/entities/sprites.interface.js";
import { CreatePokemonDto } from "../dto/pokemon/create-pokemon.dto.js";

export class PokemonBuilder {
  private id: number | null = null;
  private pokemonName: string | null = null;
  private types: string[] | null = [];
  private ability: string | null = null;
  private sprite: Sprites | null = null;
  private timesCaught = 1;

  setId(id: number) {
    this.id = id;
    return this;
  }

  setName(name: string) {
    this.pokemonName = name;
    return this;
  }

  setTypes(types: string[]) {
    this.types = types;
    return this;
  }

  setAbility(ability: string) {
    this.ability = ability;
    return this;
  }

  setSprite(sprites: Sprites) {
    const { frontDefault, frontShiny, backDefault, backShiny } = sprites;
    this.sprite = { frontDefault, frontShiny, backDefault, backShiny };
    return this;
  }

  setTimesCaught(timesCaught: number) {
    this.timesCaught = timesCaught;
    return this;
  }

  build(): PokemonEntity {
    if (!this.types) throw new Error("Types are required");
    if (!this.pokemonName) throw new Error("Name is required");
    if (!this.ability) throw new Error("Ability is required");
    if (!this.sprite) throw new Error("Sprite is required");

    return PokemonEntity.fromObject({
      name: this.pokemonName,
      types: this.types,
      ability: this.ability,
      sprites: this.sprite,
      timesCaught: this.timesCaught,
    });
  }
}
