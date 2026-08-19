interface PokemonEntityProps {
  id: number | null;
  name: string;
  nickname?: string;
  types: string[];
  ability: string;
  isShiny?: boolean;
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
  public isShiny: boolean;
  public sprites: {
    frontDefault: string;
    backDefault: string;
    backShiny: string;
    frontShiny: string;
  };
  public timesCaught: number;
  public nickname?: string;

  constructor(props: PokemonEntityProps) {
    const { id, name, types, ability, isShiny = false, sprites, timesCaught = 1, nickname } = props;
    this.id = id;
    this.name = name;
    this.types = types;
    this.ability = ability;
    this.isShiny = isShiny;
    this.sprites = sprites;
    this.timesCaught = timesCaught;
    if (nickname) {
      this.nickname = nickname;
    }
  }

  public static fromObject(props: Partial<PokemonEntity>): PokemonEntity {
    try {
      const {
        id = null,
        name,
        types,
        ability,
        isShiny = false,
        sprites,
        timesCaught = 1,
        nickname,
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
        isShiny,
        sprites,
        timesCaught,
        ...(nickname && { nickname }),
      });
    } catch (error) {
      throw new Error(`The following field is was not found when creating the pokemon: ${error}`, {
        cause: error,
      });
    }
  }

  public spendForShiny(cap: number): PokemonEntity {
    if (this.isShiny) {
      throw new Error(`${this.name} is already shiny`);
    }
    if (this.timesCaught < cap) {
      throw new Error(`You need at least ${cap} catches to make ${this.name} shiny`);
    }

    return new PokemonEntity({
      ...this,
      isShiny: true,
      timesCaught: this.timesCaught - cap,
    });
  }
}
