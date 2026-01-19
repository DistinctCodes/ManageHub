// backend/src/auth/interfaces/jwt-payload.interface.ts
export interface JwtPayload {
  sub: string; // user id
  email: string;
  role: string;
}
