import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../auth/enums/user-role.enum';
import { WalletsService } from './wallets.service';
import { WalletLinkIdempotencyService } from './wallet-link-idempotency.service';
import { WalletResponseDto } from './dto/wallet-response.dto';
import { LinkChallengeResponseDto } from './dto/link-challenge-response.dto';
import { CreateLinkChallengeDto } from './dto/create-link-challenge.dto';
import { VerifyLinkDto } from './dto/verify-link.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';
import { Throttle } from '@nestjs/throttler';

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
    private readonly idempotency: WalletLinkIdempotencyService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: "Get the current user's wallet status" })
  @ApiResponse({ status: 200, type: WalletResponseDto })
  async getMine(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<WalletResponseDto> {
    const view = await this.walletsService.getWalletStatus(currentUser.id);
    return WalletResponseDto.fromView(view);
  }

  @Post('provision')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Replays the original response for a retried request with the same key',
  })
  @ApiOperation({
    summary: 'Provision a custodial wallet for the current user (idempotent)',
  })
  @ApiResponse({ status: 201, type: WalletResponseDto })
  async provision(
    @CurrentUser() currentUser: RequestUser,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<WalletResponseDto> {
    return this.idempotency.run(
      currentUser.id,
      idempotencyKey,
      { operation: 'provision' },
      async () => {
        await this.walletsService.provisionCustodialWallet(currentUser.id);
        const view = await this.walletsService.getWalletStatus(currentUser.id);
        return WalletResponseDto.fromView(view);
      },
    );
  }

  @Post('link/challenge')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Issue a single-use message to sign with an external wallet',
  })
  @ApiResponse({ status: 201, type: LinkChallengeResponseDto })
  async requestChallenge(
    @CurrentUser() currentUser: RequestUser,
    @Body() dto: CreateLinkChallengeDto,
  ): Promise<LinkChallengeResponseDto> {
    return this.walletsService.createLinkChallenge(
      currentUser.id,
      dto?.address,
    );
  }

  @Post('link/verify')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description:
      'Replays the original response for a retried request with the same key',
  })
  @ApiOperation({
    summary:
      'Verify a signed challenge and link (or upgrade to) an external wallet',
  })
  @ApiResponse({ status: 200, type: WalletResponseDto })
  async verifyLink(
    @CurrentUser() currentUser: RequestUser,
    @Body() dto: VerifyLinkDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<WalletResponseDto> {
    return this.idempotency.run(
      currentUser.id,
      idempotencyKey,
      {
        operation: 'link/verify',
        nonce: dto.nonce,
        address: dto.address,
        signature: dto.signature,
      },
      async () => {
        await this.walletsService.verifyAndLinkExternalWallet(
          currentUser.id,
          dto.nonce,
          dto.address,
          dto.signature,
        );
        const view = await this.walletsService.getWalletStatus(currentUser.id);
        return WalletResponseDto.fromView(view);
      },
    );
  }

  @Post(':userId/fund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Admin-only: credit a custodial wallet (reason required, audited)',
  })
  @ApiResponse({ status: 201, type: WalletResponseDto })
  async fund(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: FundWalletDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<WalletResponseDto> {
    await this.walletsService.fundCustodialWallet(
      userId,
      dto.amount,
      dto.reason,
      currentUser.id,
    );
    const view = await this.walletsService.getWalletStatus(userId);
    return WalletResponseDto.fromView(view);
  }
}
