import { MembershipType } from '../entities/user.entity';
export declare class RegisterDto {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    membershipType: MembershipType;
}
