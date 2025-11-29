import { IPokemon } from "./IPokemon.dto";

export interface IUser {
  id?: number;
  username: string;
  pokeparty?: IPokemon;
}
