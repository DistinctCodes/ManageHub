import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
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
}
