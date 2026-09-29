import type { UserEntity } from "../entities/users.entity.js";

export abstract class UserDataSource {
  abstract findUserByTelegramId(telegramId: number | bigint): Promise<UserEntity | null>;
  abstract createUser(user: UserEntity): Promise<UserEntity>;
  abstract updateUser(user: UserEntity, data: Partial<UserEntity>): Promise<UserEntity>;
  abstract getLeaderboard(limit?: number): Promise<UserEntity[]>;
  abstract deleteUserByTelegramId(telegramId: number | bigint): Promise<void>;
}
