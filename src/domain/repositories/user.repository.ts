import type { CreateUserDto } from "../dto/user/create-user.dto.js";
import type { UpdateUserDto } from "../dto/user/update-user.dto.js";
import type { UserEntity } from "../entities/users.entity.js";

export abstract class UserRepository {
  abstract findUserById(id: number): Promise<UserEntity | null>;
  abstract findUserByUsername(username: string): Promise<UserEntity | null>;
  abstract updateUser(
    user: UserEntity,
    data: UpdateUserDto,
  ): Promise<UserEntity>;
  abstract createUser(user: CreateUserDto): Promise<UserEntity>;
  abstract deleteUserById(id: number): Promise<void>;
  abstract deleteUserByUsername(username: string): Promise<void>;
}
