import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from './guard/jwt.auth.guard';
import { RolesGuard } from './guard/roles.guard';
import { Roles } from './decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { User } from '../users/entities/user.entity';
import { CurrentUser } from './decorators/current.user.decorators';
import { Public } from './decorators/public.decorator';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { SendPasswordResetOtpDto } from './dto/send-password-reset-otp.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUser(createUserDto);
  }

  @Public()
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }
  @Public()
  @Post('resend-verification-otp')
  @HttpCode(HttpStatus.OK)
  resendVerificationOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendVerificationOtp(resendOtpDto.email);
  }

  @Post('register-admin')
  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  createAdmin(@Body() createUserDto: CreateUserDto) {
    return this.authService.createAdminUser(createUserDto);
  }
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }
  @Public()
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }

  @Get('current-user')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  retrieveCurrentUser(@CurrentUser() user: User) {
    return user;
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  forgotPassword(
    @Body() sendPasswordResetOtpDto: SendPasswordResetOtpDto,
  ) {
    return this.authService.requestResetPasswordOtp(sendPasswordResetOtpDto);
  }

  @Public()
  @Post('send-reset-password-otp')
  @HttpCode(HttpStatus.OK)
  requestResetPasswordOtp(
    @Body() sendPasswordResetOtpDto: SendPasswordResetOtpDto,
  ) {
    return this.authService.requestResetPasswordOtp(sendPasswordResetOtpDto);
  }
  @Public()
  @Post('resend-reset-password-otp')
  @HttpCode(HttpStatus.OK)
  resendResetPasswordVerificationOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendResetPasswordVerificationOtp(resendOtpDto);
  }

  @Public()
  @Post('verify-reset-password-otp')
  @HttpCode(HttpStatus.OK)
  verifyResetPasswordOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyResetPasswordOtp(verifyOtpDto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}
