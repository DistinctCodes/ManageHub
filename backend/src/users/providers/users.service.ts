import { Injectable } from '@nestjs/common';
import { CreateUserDto } from '../dto/createUser.dto';
import { User } from '../entities/user.entity';
import { CreateUserProvider } from './createUser.provider';

@Injectable()
export class UsersService {
  constructor(private readonly createUserProvider: CreateUserProvider) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    return await this.createUserProvider.createUser(createUserDto);
  }
}
