import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Repository } from 'typeorm';
import { ErrorCatch } from 'utils/error';

@Injectable()
export class FindOneUserByIdProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  public async getUser(id: string): Promise<User> {
    try {
      const user = await this.usersRepository.findOne({
        where: {
          id,
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
