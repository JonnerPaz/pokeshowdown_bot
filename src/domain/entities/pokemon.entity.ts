interface PokemonEntityProps {
  id: number | null;
  name: string;
  types: string[];
  ability: string;
  sprites: {
    frontDefault: string;
    backDefault: string;
    backShiny: string;
    frontShiny: string;
  };
  timesCaught?: number;
}

export class PokemonEntity {
  public id: number | null = null;
  public name: string;
  public types: string[];
  public ability: string;
  public sprites: {
    frontDefault: string;
    backDefault: string;
    backShiny: string;
    frontShiny: string;
  };
  public timesCaught: number;

  constructor(props: PokemonEntityProps) {
    const { id, name, types, ability, sprites, timesCaught = 1 } = props;
    this.id = id;
    this.name = name;
    this.types = types;
    this.ability = ability;
    this.sprites = sprites;
    this.timesCaught = timesCaught;
  }

  public static fromObject(props: Partial<PokemonEntity>): PokemonEntity {
    try {
      const {
        id = null,
        name,
        types,
        ability,
        sprites,
        timesCaught = 1,
      } = props;
      if (!name) throw new Error("Name is required");
      if (!types) throw new Error("Types are required");
      if (!ability) throw new Error("Ability is required");
      if (!sprites) throw new Error("Sprites are required");

      return new PokemonEntity({
        id,
        name,
        types,
        ability,
        sprites,
        timesCaught,
      });
    } catch (error) {
      throw new Error(
        `The following field is was not found when creating the pokemon: ${error}`,
      );
    }
  }
}
