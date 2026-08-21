import { Request } from 'express';
import { UserRole } from '../enums/user-role.enum';

export interface RequestUser {
  id: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user: RequestUser;
}
