export interface JwtPayload {
  userId: number;
  email?: string;
  fullName?: string;
  role?: string;
  iat?: string;
  exp?: string;
}
