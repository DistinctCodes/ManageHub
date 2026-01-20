import { PaymentsService } from './payments.service';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    initializePayment(req: any, initializePaymentDto: InitializePaymentDto): Promise<{
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
            status: import("./entities/payment.entity").PaymentStatus.SUCCESS;
            paidAt: Date;
        };
    }>;
}
