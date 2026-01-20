import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { User } from '../auth/entities/user.entity';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaystackService } from './paystack.service';
export declare class PaymentsService {
    private readonly paymentRepository;
    private readonly userRepository;
    private readonly paystackService;
    private readonly logger;
    constructor(paymentRepository: Repository<Payment>, userRepository: Repository<User>, paystackService: PaystackService);
    initializePayment(userId: string, initializePaymentDto: InitializePaymentDto): Promise<{
        success: boolean;
        message: string;
        data: {
            authorizationUrl: string;
            accessCode: string;
            reference: string;
        };
    }>;
    verifyPayment(reference: string): Promise<{
        success: boolean;
        message: string;
        data: {
            reference: string;
            amount: number;
            status: PaymentStatus.SUCCESS;
            paidAt: Date;
        };
    }>;
}
