import { Injectable } from '@nestjs/common';
import { UsersService } from '../../users/providers/users.service';
import { CreateUserDto } from '../../users/dto/createUser.dto';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    return await this.usersService.createUser(createUserDto);
  }
}
