import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/createUser.dto';
import { UpdateUserDto } from '../dto/updateUser.dto';
import { User } from '../entities/user.entity';
import { CreateUserProvider } from './createUser.provider';
import { FindOneUserByIdProvider } from './findOneUserById.provider';
import { FindOneUserByEmailProvider } from './findOneUserByEmail.provider';
import { ValidateUserProvider } from './validateUser.provider';
import { FindAllUsersProvider } from './findAllUsers.provider';
import { UpdateUserProvider } from './updateUser.provider';
import { DeleteUserProvider } from './deleteUser.provider';
import { AuthResponse } from 'src/auth/interfaces/authResponse.interface';
import { Response } from 'express';

@Injectable()
export class UsersService {
  constructor(
    private readonly createUserProvider: CreateUserProvider,
    private readonly findOneUserByIdProvider: FindOneUserByIdProvider,
    private readonly findOneUserByEmailProvider: FindOneUserByEmailProvider,
    private readonly validateUserProvider: ValidateUserProvider,
    private readonly findAllUsersProvider: FindAllUsersProvider,
    private readonly updateUserProvider: UpdateUserProvider,
    private readonly deleteUserProvider: DeleteUserProvider,
  ) {}

  // CREATE USER
  async createUser(
    createUserDto: CreateUserDto,
    response: Response,
  ): Promise<AuthResponse> {
    return await this.createUserProvider.createUser(createUserDto, response);
  }

  // FIND ALL USERS
  async findAllUsers(): Promise<User[]> {
    return await this.findAllUsersProvider.getUsers();
  }

  // FIND USER BY ID
  async findUserById(id: string): Promise<User> {
    return await this.findOneUserByIdProvider.getUser(id);
  }

  // FIND USER BY EMAIL
  async findUserByEmail(email: string): Promise<User> {
    return await this.findOneUserByEmailProvider.getUser(email);
  }

  // UPDATE USER
  async updateUser(id: string, updateData: UpdateUserDto): Promise<User> {
    return await this.updateUserProvider.updateUser(id, updateData);
  }

  // DELETE USER
  async deleteUser(id: string): Promise<void> {
    return await this.deleteUserProvider.deleteUser(id);
  }

  // VALIDATE USER
  async validateUser(
    email: string,
    password: string,
  ): Promise<Partial<User>> {
    return await this.validateUserProvider.validateUser(email, password);
  }
}
