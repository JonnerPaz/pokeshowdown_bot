import type { UserRepository } from "../../domain/repositories/user.repository.js";
import { UserEntity } from "../../domain/entities/users.entity.js";
import { UserDataSource } from "../../domain/datasource/user.datasource.js";
import type { UpdateUserDto } from "../../domain/dto/user/update-user.dto.js";

export class UserRepositoryImpl implements UserRepository {
  constructor(public dataSource: UserDataSource) {}

  public async findUserById(id: number): Promise<UserEntity | null> {
    return await this.dataSource.findUserById(id);
  }

  public async findUserByUsername(
    username: string,
  ): Promise<UserEntity | null> {
    return await this.dataSource.findUserByUsername(username);
  }

  public async updateUser(
    user: UserEntity,
    data: UpdateUserDto,
  ): Promise<UserEntity> {
    return await this.dataSource.updateUser(user, data);
  }

  public async createUser(user: any): Promise<UserEntity> {
    return await this.dataSource.createUser(user);
  }

  public async deleteUserById(id: number): Promise<void> {
    return await this.dataSource.deleteUserById(id);
  }

  public async deleteUserByUsername(username: string): Promise<void> {
    return await this.dataSource.deleteUserByUsername(username);
  }
}
