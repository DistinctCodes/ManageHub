export interface JwtPayload {
  sub: string;
  email?: string;
  fullName?: string;
  role?: string;
  iat?: number;
  exp?: number;
}
