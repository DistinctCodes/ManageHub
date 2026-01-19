import { User } from './user.entity';
export declare class PasswordHistory {
    id: string;
    user: User;
    passwordHash: string;
    createdAt: Date;
}
