import { User } from './user.entity';
export declare class RefreshToken {
    id: string;
    user: User;
    token: string;
    expiresAt: Date;
    revoked: boolean;
    createdAt: Date;
}
