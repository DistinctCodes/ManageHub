import { ConfigService } from '@nestjs/config';
interface PaystackInitializeResponse {
    status: boolean;
    message: string;
    data: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}
interface PaystackVerifyResponse {
    status: boolean;
    message: string;
    data: {
        reference: string;
        amount: number;
        status: string;
        paid_at: string;
        metadata: any;
    };
}
export declare class PaystackService {
    private configService;
    private readonly logger;
    private readonly secretKey;
    constructor(configService: ConfigService);
    initializeTransaction(email: string, amount: number, reference: string, metadata?: any): Promise<PaystackInitializeResponse>;
    verifyTransaction(reference: string): Promise<PaystackVerifyResponse>;
}
export {};
