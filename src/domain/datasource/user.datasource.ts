import type { UserEntity } from "../entities/users.entity.js";
import type { BallType } from "../items/ballTypes.js";

export abstract class UserDataSource {
  abstract findUserByTelegramId(telegramId: number | bigint): Promise<UserEntity | null>;
  abstract createUser(user: UserEntity): Promise<UserEntity>;
  abstract updateUser(user: UserEntity, data: Partial<UserEntity>): Promise<UserEntity>;
  /**
   * Atomically decrements one ball of the given type from the user's inventory.
   * Implementations must perform the decrement at the storage layer (not read-modify-write)
   * so concurrent throws cannot lose an update.
   */
  abstract decrementBall(user: UserEntity, ballType: BallType): Promise<UserEntity>;
  abstract getLeaderboard(limit?: number): Promise<UserEntity[]>;
  abstract deleteUserByTelegramId(telegramId: number | bigint): Promise<void>;
}
