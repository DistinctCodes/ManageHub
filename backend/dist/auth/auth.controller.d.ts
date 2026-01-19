import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto): Promise<{
        success: boolean;
        message: string;
        data: {
            userId: string;
            email: string;
            verificationEmailSent: boolean;
        };
    }>;
    resendVerification(email: string): Promise<{
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
                status: import("./entities/user.entity").UserStatus.PENDING_VERIFICATION | import("./entities/user.entity").UserStatus.ACTIVE;
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
}
