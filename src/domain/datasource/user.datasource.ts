import type { UserEntity } from "../entities/users.entity.js";

export abstract class UserDataSource {
  abstract findUserByUsername(username: string): Promise<UserEntity | null>;
  abstract createUser(user: UserEntity): Promise<UserEntity>;
  abstract deleteUserById(id: number): Promise<void>;
  abstract deleteUserByUsername(username: string): Promise<void>;
}
