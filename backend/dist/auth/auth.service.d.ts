import { Repository } from 'typeorm';
import { User, UserStatus } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthService {
    private readonly userRepository;
    private readonly emailService;
    private readonly jwtService;
    private readonly configService;
    private readonly logger;
    constructor(userRepository: Repository<User>, emailService: EmailService, jwtService: JwtService, configService: ConfigService);
    register(registerDto: RegisterDto): Promise<{
        success: boolean;
        message: string;
        data: {
            userId: string;
            email: string;
            verificationEmailSent: boolean;
        };
    }>;
    resendVerificationEmail(email: string): Promise<{
        success: boolean;
        message: string;
        data: {
            emailSent: boolean;
        };
    }>;
    verifyEmail(verifyEmailDto: VerifyEmailDto): Promise<{
        success: boolean;
        message: string;
        data: {
            email: string;
            verified: boolean;
        };
    }>;
    login(loginDto: LoginDto): Promise<{
        success: boolean;
        message: string;
        data: {
            user: {
                id: string;
                fullName: string;
                email: string;
                phone: string;
                membershipType: import("./entities/user.entity").MembershipType;
                role: import("./entities/user.entity").UserRole;
                status: UserStatus.PENDING_VERIFICATION | UserStatus.ACTIVE;
                emailVerified: true;
                profilePicture: string;
                stellarWalletAddress: string;
            };
            tokens: {
                accessToken: string;
                refreshToken: string;
            };
        };
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        success: boolean;
        message: string;
        data: {
            email: string;
            resetEmailSent: boolean;
        };
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        success: boolean;
        message: string;
        data: {
            email: string;
            passwordChanged: boolean;
        };
    }>;
    private generateTokens;
}
