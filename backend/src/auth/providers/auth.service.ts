import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/providers/users.service';
import { CreateUserDto } from '../../users/dto/createUser.dto';
import { User } from '../../users/entities/user.entity';
import { LoginUserProvider } from './loginUser.provider';
import { AuthResponse } from '../interfaces/authResponse.interface';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,

    private readonly loginUserProvider: LoginUserProvider,
  ) {}

  // CREATE USER
  async createUser(
    createUserDto: CreateUserDto,
    response: Response,
  ): Promise<AuthResponse> {
    return await this.usersService.createUser(createUserDto, response);
  }

  // VALIDATE USER
  public async validateUser(
    email: string,
    password: string,
  ): Promise<Partial<User>> {
    return await this.usersService.validateUser(email, password);
  }

  // LOGIN USER
  public async loginUser(
    user: User,
    response: Response,
  ): Promise<AuthResponse> {
    return await this.loginUserProvider.loginUser(user, response);
  }
}
