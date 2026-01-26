interface CreatePokemonDtoProps {
  name: string;
  types: string[];
  ability: string;
  sprites: {
    frontDefault: string;
    backDefault: string;
    backShiny: string;
    frontShiny: string;
  };
  timesCaught: number;
}

export class CreatePokemonDto {
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

  constructor(props: CreatePokemonDtoProps) {
    this.name = props.name;
    this.types = props.types;
    this.ability = props.ability;
    this.sprites = props.sprites;
    this.timesCaught = props.timesCaught;
  }

  static fromObject(props: CreatePokemonDtoProps): CreatePokemonDto {
    const { name, types, ability, sprites, timesCaught = 1 } = props;
    if (!name) throw new Error("Name is required");
    if (!types) throw new Error("Types are required");
    if (!ability) throw new Error("Ability is required");
    if (!sprites) throw new Error("Sprites are required");

    return new CreatePokemonDto({
      name,
      types,
      ability,
      sprites,
      timesCaught,
    });
  }
}
