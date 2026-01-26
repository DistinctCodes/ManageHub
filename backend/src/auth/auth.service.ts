import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { UserHelper } from './helper/user-helper';
import { InjectRepository } from '@nestjs/typeorm';
import { UserMessages } from './helper/user-messages';
import { UserRole } from './common/enum/user-role-enum';
import { JwtHelper } from './helper/jwt-helper';
import moment from 'moment';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { SendPasswordResetOtpDto } from './dto/send-password-reset-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly userHelper: UserHelper,
    private readonly jwtHelper: JwtHelper,
  ) {}

  async createUser(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(UserMessages.EMAIL_ALREADY_EXIST);
    }

    const validPassword = this.userHelper.isValidPassword(
      createUserDto.password,
    );
    if (!validPassword) {
      throw new ConflictException(UserMessages.IS_VALID_PASSWORD);
    }
    const hashedPassword = await this.userHelper.hashPassword(
      createUserDto.password,
    );
    const verificationCode = this.userHelper.generateVerificationCode();
    const expiration = moment().add(10, 'minutes').toDate();
    const newUser = this.userRepository.create({
      email: createUserDto.email,
      fullName: createUserDto.fullName,
      password: hashedPassword,
      role: UserRole.SUBSCRIBER,
      verificationCode: verificationCode,
      verificationCodeExpiresAt: expiration,
      isVerified: false,
    });
    await this.userRepository.save(newUser);
    // await this.emailService.sendVerificationEmail(
    //   createUserDto.email,
    //   verificationCode,
    //   createUserDto.fullName,
    // );

    return {
      message: UserMessages.USER_CREATED_SUCCESSFULLY,
    };
  }

  async createAdminUser(createUserDto: CreateUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException(UserMessages.EMAIL_ALREADY_EXIST);
    }

    const validPassword = this.userHelper.isValidPassword(
      createUserDto.password,
    );
    if (!validPassword) {
      throw new ConflictException(UserMessages.IS_VALID_PASSWORD);
    }
    const hashedPassword = await this.userHelper.hashPassword(
      createUserDto.password,
    );
    const newUser = this.userRepository.create({
      email: createUserDto.email,
      fullName: createUserDto.fullName,
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await this.userRepository.save(newUser);
    return {
      message: UserMessages.USER_CREATED_SUCCESSFULLY,
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    if (!email) {
      throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
    }

    if (!otp) {
      throw new BadRequestException(UserMessages.OTP_REQUIRED);
    }

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException(UserMessages.USER_NOT_FOUND);
    }

    if (user.verificationCode !== otp) {
      throw new UnauthorizedException(UserMessages.INVALID_OTP);
    }

    if (
      !user.verificationCodeExpiresAt ||
      user.verificationCodeExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(UserMessages.OTP_EXPIRED);
    }

    user.isVerified = true;
    user.verificationCode = '';
    user.verificationCodeExpiresAt = undefined;

    await this.userRepository.save(user);

    const tokens = this.jwtHelper.generateTokens(user);

    return {
      message: UserMessages.VERIFY_OTP_SUCCESS,
      user: this.userHelper.formatUserResponse(user),
      tokens: tokens,
    };
  }

  async resendVerificationOtp(email: string) {
    try {
      if (!email) {
        throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
      }

      const user = await this.userRepository.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }

      const verificationCode = this.userHelper.generateVerificationCode();

      user.verificationCode = verificationCode;
      user.verificationCodeExpiresAt = moment().add(10, 'minutes').toDate();
      await this.userRepository.save(user);

      // await this.emailService.sendVerificationEmail(
      //   user.email,
      //   verificationCode,
      //   user.fullName,
      // );

      return { message: UserMessages.OTP_SENT };
    } catch (error) {
      throw new InternalServerErrorException(
        error || 'Error resending verification code',
      );
    }
  }

  async login(loginUserDto: LoginUserDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginUserDto.email },
    });
    if (
      !user ||
      !(await this.userHelper.verifyPassword(
        loginUserDto.password,
        user.password,
      ))
    ) {
      throw new UnauthorizedException(UserMessages.INVALID_CREDENTIALS);
    }

    if (!user.isVerified) {
      await this.resendVerificationOtp(loginUserDto.email);
      return {
        message: UserMessages.EMAIL_NOT_VERIFIED,
        user: this.userHelper.formatUserResponse(user),
      };
    }
    const tokens = this.jwtHelper.generateTokens(user);
    return {
      user: this.userHelper.formatUserResponse(user),
      tokens: tokens,
    };
  }
  async refreshToken(refreshToken: string) {
    const validatedRefreshToken =
      this.jwtHelper.validateRefreshToken(refreshToken);
    const userId = Number(validatedRefreshToken);
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException(UserMessages.INVALID_REFRESH_TOKEN);
    }
    const accessToken = this.jwtHelper.generateAccessToken(user);
    return { accessToken };
  }
  async retrieveUserById(userId: number) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    const result = this.userHelper.formatUserResponse(user);
    return result;
  }

  async requestResetPasswordOtp(
    sendPasswordResetOtpDto: SendPasswordResetOtpDto,
  ) {
    if (!sendPasswordResetOtpDto.email) {
      throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
    }

    const user = await this.userRepository.findOne({
      where: { email: sendPasswordResetOtpDto.email },
    });

    if (!user) {
      throw new NotFoundException(UserMessages.USER_NOT_FOUND);
    }

    const otp = this.userHelper.generateVerificationCode();

    user.passwordResetCode = otp;
    user.passwordResetCodeExpiresAt = moment().add(10, 'minutes').toDate();
    await this.userRepository.save(user);

    // await this.emailService.sendPasswordResetEmail(
    //   user.email,
    //   otp,
    //   user.fullName,
    // );

    return { message: UserMessages.OTP_SENT };
  }

  async resendResetPasswordVerificationOtp(resendOtpDto: ResendOtpDto) {
    try {
      if (!resendOtpDto.email) {
        throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
      }

      const user = await this.userRepository.findOne({
        where: { email: resendOtpDto.email },
      });
      if (!user) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }

      const otp = this.userHelper.generateVerificationCode();

      user.passwordResetCode = otp;
      user.passwordResetCodeExpiresAt = moment().add(10, 'minutes').toDate();
      await this.userRepository.save(user);

      // await this.emailService.sendPasswordResetEmail(
      //   user.email,
      //   otp,
      //   user.fullName,
      // );

      return { message: UserMessages.OTP_SENT };
    } catch (error) {
      throw new InternalServerErrorException(
        error || 'Error resending verification code',
      );
    }
  }

  async verifyResetPasswordOtp(verifyOtpDto: VerifyOtpDto) {
    if (!verifyOtpDto.email) {
      throw new BadRequestException(UserMessages.EMAIL_REQUIRED);
    }

    if (!verifyOtpDto.otp) {
      throw new BadRequestException(UserMessages.OTP_REQUIRED);
    }

    const user = await this.userRepository.findOne({
      where: { email: verifyOtpDto.email },
    });

    if (!user) {
      throw new NotFoundException(UserMessages.USER_NOT_FOUND);
    }

    if (user.passwordResetCode !== verifyOtpDto.otp) {
      throw new UnauthorizedException(UserMessages.INVALID_OTP);
    }

    if (
      !user.passwordResetCodeExpiresAt ||
      (user.passwordResetCodeExpiresAt instanceof Date &&
        user.passwordResetCodeExpiresAt < new Date())
    ) {
      throw new UnauthorizedException(UserMessages.OTP_EXPIRED);
    }

    await this.userRepository.save(user);

    return { message: UserMessages.OTP_VERIFIED };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { otp, newPassword, confirmNewPassword } = resetPasswordDto;

    const user = await this.userRepository.findOneBy({
      passwordResetCode: otp,
    });

    if (!user) {
      throw new NotFoundException(UserMessages.USER_NOT_FOUND);
    }

    if (
      !user.passwordResetCodeExpiresAt ||
      user.passwordResetCodeExpiresAt < new Date()
    ) {
      throw new UnauthorizedException(UserMessages.OTP_EXPIRED);
    }

    if (!this.userHelper.isValidPassword(newPassword)) {
      throw new BadRequestException(UserMessages.IS_VALID_PASSWORD);
    }

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException(UserMessages.PASSWORDS_DO_NOT_MATCH);
    }
    user.password = await this.userHelper.hashPassword(newPassword);
    user.passwordResetCode = undefined;
    user.passwordResetCodeExpiresAt = undefined;

    await this.userRepository.save(user);

    return {
      message: UserMessages.PASSWORDS_RESET_SUCCESSFUL,
    };
  }
}
