import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { Response, CookieOptions } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestUser } from './interfaces/authenticated-request.interface';
import { UserRole } from './enums/user-role.enum';

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a local account and issue a JWT' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.register(dto);
    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS);
    return result;
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with email/password and issue a JWT' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.login(dto);
    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS);
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Log out: revoke outstanding tokens (bump tokenVersion) and clear the cookie',
  })
  async logout(
    @CurrentUser() currentUser: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.logout(currentUser.id);
    res.clearCookie('accessToken', COOKIE_OPTIONS);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Sign out everywhere: revoke every token issued to this user',
  })
  async logoutAll(
    @CurrentUser() currentUser: RequestUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.signOutEverywhere(currentUser.id);
    res.clearCookie('accessToken', COOKIE_OPTIONS);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Change the password, revoke all existing tokens, and issue a fresh one',
  })
  async changePassword(
    @CurrentUser() currentUser: RequestUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponseDto> {
    const result = await this.authService.changePassword(currentUser.id, dto);
    res.cookie('accessToken', result.accessToken, COOKIE_OPTIONS);
    return result;
  }

  @Patch('users/:id/role')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Admin: change a user role and revoke their outstanding tokens',
  })
  async updateUserRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserRoleDto,
  ): Promise<{ id: string; role: UserRole }> {
    const user = await this.authService.updateUserRole(id, dto.role);
    return { id: user.id, role: user.role };
  }
}
