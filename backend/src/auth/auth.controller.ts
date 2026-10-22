import {
  Body,
  Controller,
  Get,
  HttpCode,
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
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { AuthResponseDto, AuthUserDto } from './dto/auth-response.dto';
import { Response, CookieOptions } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { RequestUser } from './interfaces/authenticated-request.interface';
import { UserRole } from './enums/user-role.enum';
import { Throttle } from '@nestjs/throttler';

const COOKIE_OPTIONS: CookieOptions = {
  httpOnly: true,
  sameSite: 'strict',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 7 * 24 * 60 * 60 * 1000,
} as const;

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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Return the authenticated user (id, email, role) so the client can restore a session from the HttpOnly cookie without exposing it to JavaScript',
  })
  async me(@CurrentUser() currentUser: RequestUser): Promise<AuthUserDto> {
    return this.authService.me(currentUser);
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
  @HttpCode(204)
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

  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Email a single-use password reset link when the account exists' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.requestPasswordReset(dto.email);
    return { message: 'If an account exists for that email, a reset link has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(204)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Reset a password using a single-use email token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    await this.authService.resetPassword(dto);
    res.clearCookie('accessToken', COOKIE_OPTIONS);
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
