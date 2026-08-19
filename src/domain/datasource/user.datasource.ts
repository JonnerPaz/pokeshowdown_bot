import type { UserEntity } from "../entities/users.entity.js";

export abstract class UserDataSource {
  abstract findUserByTelegramId(telegramId: number): Promise<UserEntity | null>;
  abstract createUser(user: UserEntity): Promise<UserEntity>;
  abstract deleteUserByTelegramId(telegramId: number): Promise<void>;
}
