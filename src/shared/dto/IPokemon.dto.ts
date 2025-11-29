import { ISpriteType } from "./ISpriteType.dto";

export interface IPokemon {
  id: number;
  sprite: ISpriteType;
  name: string;
  ability: string;
  heldItem: string;
  counter: number;
}
