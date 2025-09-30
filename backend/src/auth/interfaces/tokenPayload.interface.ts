export interface TokenPayload {
  userId?: string;
  sub?: string;
  email?: string;
  role?: string;
  iat?: number;
  exp?: number;
}
