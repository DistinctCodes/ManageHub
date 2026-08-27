import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RequestUser } from './interfaces/authenticated-request.interface';
import { UserRole } from './enums/user-role.enum';

interface JwtPayload {
  sub: string;
  role: RequestUser['role'];
}

@Injectable()
export class JwtTokenVerifierService {
  constructor(private readonly jwtService: JwtService) {}

  async verify(token: string): Promise<RequestUser> {
    const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    return { id: payload.sub, role: payload.role ?? UserRole.USER };
  }
}
