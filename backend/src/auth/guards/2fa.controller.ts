// two-factor.controller.ts
import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { TwoFactorService } from '../2fa.service';
import { Verify2faDto } from '../dto/verify-2fa.dto';

@Controller('api/auth/2fa')
export class TwoFactorController {
  constructor(private readonly twoFactorService: TwoFactorService) {}

  /**
   * Verify TOTP during login
   * 5 attempts per 15 minutes
   */
  @UseGuards(ThrottlerGuard)
  @Throttle(5, 900)
  @Post('verify')
  async verify2fa(@Req() req, @Body() dto: Verify2faDto) {
    return this.twoFactorService.verifyTOTP(
      req.user.id,
      dto.token,
    );
  }
}
