import { User } from '../../auth/entities/user.entity';
export declare enum PaymentStatus {
    PENDING = "pending",
    SUCCESS = "success",
    FAILED = "failed",
    CANCELLED = "cancelled"
}
export declare enum PaymentPlan {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly",
    QUARTERLY = "quarterly",
    YEARLY = "yearly"
}
export declare class Payment {
    id: string;
    user: User;
    reference: string;
    amount: number;
    membershipType: string;
    paymentPlan: PaymentPlan;
    status: PaymentStatus;
    paystackReference: string | null;
    accessCode: string | null;
    metadata: Record<string, any> | null;
    paidAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
