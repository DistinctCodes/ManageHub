import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/providers/users.service';
import { CreateUserDto } from '../../users/dto/createUser.dto';
import { User } from '../../users/entities/user.entity';
import { LoginUserProvider } from './loginUser.provider';
import { AuthResponse } from '../interfaces/authResponse.interface';
import { Response } from 'express';
import { VerifyEmailProvider } from './verifyEmail.provider';
import { ResendVerificationEmailProvider } from './resendVerificationEmail.provider';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly loginUserProvider: LoginUserProvider,
    private readonly verifyEmailProvider: VerifyEmailProvider,
    private readonly resendVerificationEmailProvider: ResendVerificationEmailProvider,
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

  // FORGOT PASSWORD
  public async forgotPassword(email: string) {
    return await this.usersService.forgotPassword(email);
  }

  // RESET PASSWORD
  public async resetPassword(token: string, newPassword: string) {
    return await this.usersService.resetPassword(token, newPassword);
  }
  public async verifyEmail(token: string): Promise<{ message: string }> {
    return await this.verifyEmailProvider.verifyEmail(token);
  }

  public async resendVerificationEmail(
    email: string,
  ): Promise<{ message: string }> {
    return await this.resendVerificationEmailProvider.resendVerificationEmail(
      email,
    );
  }
}
