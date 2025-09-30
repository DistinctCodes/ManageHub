import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FindOneUserByEmailProvider } from './findOneUserByEmail.provider';
import { User } from '../entities/user.entity';
import { ErrorCatch } from '../../utils/error';
import { HashingProvider } from 'src/auth/providers/hashing.provider';

@Injectable()
export class ValidateUserProvider {
  constructor(
    private readonly findOneUserByEmail: FindOneUserByEmailProvider,

    private readonly hashingProvider: HashingProvider,
  ) {}

  public async validateUser(
    email: string,
    userPassword: string,
  ): Promise<Partial<User>> {
    try {
      const user = await this.findOneUserByEmail.getUser(email);

      const isPasswordValid = await this.hashingProvider.compare(
        userPassword,
        user.password,
      );

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid email/password');
      }

      const {
        password,
        passwordResetExpiresIn,
        passwordResetToken,
        refreshTokens,
        ...result
      } = user;

      return result;
    } catch (error) {
      ErrorCatch(error, 'Error validating user');
    }
  }
}
