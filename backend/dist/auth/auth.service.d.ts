import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { EmailService } from '../email/email.service';
export declare class AuthService {
    private readonly userRepository;
    private readonly emailService;
    constructor(userRepository: Repository<User>, emailService: EmailService);
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
}
