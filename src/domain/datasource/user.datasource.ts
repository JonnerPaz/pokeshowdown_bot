import type { UserEntity } from "../entities/users.entity.js";

export abstract class UserDataSource {
  abstract findUserById(id: number): Promise<UserEntity | null>;
  abstract findUserByUsername(username: string): Promise<UserEntity | null>;
  abstract updateUser(
    user: UserEntity,
    data: Partial<UserEntity>,
  ): Promise<UserEntity>;
  abstract createUser(user: UserEntity): Promise<UserEntity>;
  abstract deleteUserById(id: number): Promise<void>;
  abstract deleteUserByUsername(username: string): Promise<void>;
}
