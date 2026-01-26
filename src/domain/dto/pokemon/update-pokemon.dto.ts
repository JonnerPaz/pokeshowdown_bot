interface UpdatePokemonDtoProps {
  id: number;
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

export class UpdatePokemonDto {
  public id: number;
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

  constructor(props: UpdatePokemonDtoProps) {
    this.id = props.id;
    this.name = props.name;
    this.types = props.types;
    this.ability = props.ability;
    this.sprites = props.sprites;
    this.timesCaught = props.timesCaught;
  }

  static fromObject(props: UpdatePokemonDtoProps): UpdatePokemonDto {
    const { id, name, types, ability, sprites, timesCaught } = props;
    if (!id) throw new Error("Id is required");
    if (!name) throw new Error("Name is required");
    if (!types) throw new Error("Types are required");
    if (!ability) throw new Error("Ability is required");
    if (!sprites) throw new Error("Sprites are required");
    return new UpdatePokemonDto({
      id,
      name,
      types,
      ability,
      sprites,
      timesCaught,
    });
  }
}
