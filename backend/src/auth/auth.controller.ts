import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './providers/auth.service';
import { CreateUserDto } from '../users/dto/createUser.dto';
import { User } from '../users/entities/user.entity';
import { Public } from './decorators/public.decorator';
import { Response } from 'express';
import { AuthResponse } from './interfaces/authResponse.interface';
import { LoginUserDto } from 'src/users/dto/loginUser.dto';
import { GetCurrentUser } from './decorators/getCurrentUser.decorator';
import { LocalAuthGuard } from './guards/local.guard';
import { VerifyEmailDto } from './dto/verifyEmail.dto';
import { ResendVerifyEmailDto } from './dto/resendVerifyEmail.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // CREATE A NEW USER
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiCreatedResponse({ description: 'User registered successfully.' })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return await this.authService.createUser(createUserDto, response);
  }

  // LOGIN USER
  @Public()
  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiOkResponse({ description: 'Logged in successfully.' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  @ApiBody({ type: LoginUserDto })
  public async loginUser(
    @Body() loginUserDto: LoginUserDto,
    @GetCurrentUser() user: User,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthResponse> {
    return await this.authService.loginUser(user, response);
  }

  // VERIFY EMAIL
  @Public()
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email with token' })
  @ApiOkResponse({ description: 'Email verified successfully.' })
  @ApiBadRequestResponse({ description: 'Invalid or expired token.' })
  @ApiBody({ type: VerifyEmailDto })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<{ message: string }> {
    return await this.authService.verifyEmail(verifyEmailDto.token);
  }

  // RESEND VERIFICATION EMAIL
  @Public()
  @Post('resend-verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification link' })
  @ApiOkResponse({ description: 'Verification email sent successfully.' })
  @ApiBadRequestResponse({ description: 'User not found or already verified.' })
  @ApiBody({ type: ResendVerifyEmailDto })
  async resendVerifyEmail(
    @Body() resendVerifyEmailDto: ResendVerifyEmailDto,
  ): Promise<{ message: string }> {
    return await this.authService.resendVerificationEmail(
      resendVerifyEmailDto.email,
    );
  }
}
