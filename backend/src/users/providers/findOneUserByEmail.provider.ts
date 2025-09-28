import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { ErrorCatch } from 'utils/error';

@Injectable()
export class FindOneUserByEmailProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  public async getUser(email: string): Promise<User> {
    try {
      const user = await this.usersRepository.findOne({
        where: {
          email,
        },
      });

      if (!user) {
        throw new UnauthorizedException('Credentials are not valid');
      }

      return user;
    } catch (error) {
      ErrorCatch(error, 'Error retrieving user details');
    }
  }
}
