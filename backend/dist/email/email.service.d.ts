import { ConfigService } from '@nestjs/config';
export declare class EmailService {
    private configService;
    private transporter;
    private readonly logger;
    constructor(configService: ConfigService);
    sendVerificationEmail(to: string, name: string, token: string): Promise<boolean>;
    sendWelcomeEmail(to: string, name: string): Promise<boolean>;
    sendPasswordResetEmail(to: string, name: string, token: string): Promise<boolean>;
    sendPasswordChangeConfirmationEmail(to: string, name: string): Promise<boolean>;
}
