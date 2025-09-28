import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './providers/auth.service';
import { CreateUserDto } from '../users/dto/createUser.dto';
import { User } from '../users/entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto): Promise<User> {
    return await this.authService.createUser(createUserDto);
  }
}
