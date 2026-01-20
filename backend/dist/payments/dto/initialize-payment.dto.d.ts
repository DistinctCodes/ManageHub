import { PaymentPlan } from '../entities/payment.entity';
export declare class InitializePaymentDto {
    membershipType: string;
    paymentPlan: PaymentPlan;
    amount: number;
}
