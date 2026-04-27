import {
  Body, Controller, Post, UseGuards, Req,
  BadRequestException, UnauthorizedException, HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { IsString, MinLength, Matches } from 'class-validator';

class ChangePasswordDto {
  @IsString() currentPassword: string;
  @IsString() @MinLength(8) @Matches(/(?=.*[A-Z])(?=.*\d)/) newPassword: string;
  @IsString() confirmNewPassword: string;
}

@Controller('sandbox/auth')
@UseGuards(JwtAuthGuard)
export class ChangePasswordController {
  constructor(
    @InjectRepository('User') private readonly users: Repository<any>,
    @InjectRepository('RefreshToken') private readonly tokens: Repository<any>,
  ) {}

  @Post('change-password')
  @HttpCode(200)
  async changePassword(@Body() dto: ChangePasswordDto, @Req() req: any) {
    const { currentPassword, newPassword, confirmNewPassword } = dto;
    const user = await this.users.findOne({ where: { id: req.user.id } });

    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    if (newPassword !== confirmNewPassword)
      throw new BadRequestException('Passwords do not match');

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await this.users.save(user);

    await this.tokens.delete({ userId: user.id });

    return { message: 'Password updated successfully' };
  }
}
