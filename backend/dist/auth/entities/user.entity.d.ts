export declare enum MembershipType {
    HOT_DESK = "hot-desk",
    DEDICATED = "dedicated",
    PRIVATE_OFFICE = "private-office"
}
export declare enum UserStatus {
    PENDING_VERIFICATION = "pending-verification",
    ACTIVE = "active",
    SUSPENDED = "suspended",
    DEACTIVATED = "deactivated"
}
export declare enum UserRole {
    MEMBER = "member",
    RECEPTIONIST = "receptionist",
    MANAGER = "manager",
    SUPER_ADMIN = "super-admin"
}
export declare class User {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    passwordHash: string;
    membershipType: MembershipType;
    role: UserRole;
    status: UserStatus;
    profilePicture: string | null;
    stellarWalletAddress: string | null;
    qrCode: string | null;
    emailVerified: boolean;
    emailVerificationToken: string | null;
    emailVerificationExpiry: Date | null;
    passwordResetToken: string | null;
    passwordResetExpiry: Date | null;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
