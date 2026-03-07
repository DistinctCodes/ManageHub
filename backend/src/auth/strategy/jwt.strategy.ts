import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { UserMessages } from '../helper/user-messages';
import { JwtPayload } from '../interface/user.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly authService: AuthService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(UserMessages.ACCESS_TOKEN_SECRET_NOT_SET);
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.authService.retrieveUserById(payload.sub);
      return {
        id: user.id,
        fullName: `${user.firstname} ${user.lastname}`,
        email: user.email,
        role: payload.role,
      };
    } catch (error) {
      throw new UnauthorizedException(UserMessages.INVALID_ACCESS_TOKEN);
    }
  }
}
