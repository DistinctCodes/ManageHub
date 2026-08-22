import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
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
import { WalletResponseDto } from './dto/wallet-response.dto';
import { LinkChallengeResponseDto } from './dto/link-challenge-response.dto';
import { VerifyLinkDto } from './dto/verify-link.dto';
import { FundWalletDto } from './dto/fund-wallet.dto';

@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

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
  @ApiOperation({
    summary:
      'Provision a custodial wallet for the current user (idempotent)',
  })
  @ApiResponse({ status: 201, type: WalletResponseDto })
  async provision(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<WalletResponseDto> {
    await this.walletsService.provisionCustodialWallet(currentUser.id);
    const view = await this.walletsService.getWalletStatus(currentUser.id);
    return WalletResponseDto.fromView(view);
  }

  @Post('link/challenge')
  @ApiOperation({
    summary: 'Issue a single-use nonce to sign with an external wallet',
  })
  @ApiResponse({ status: 201, type: LinkChallengeResponseDto })
  async requestChallenge(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<LinkChallengeResponseDto> {
    return this.walletsService.createLinkChallenge(currentUser.id);
  }

  @Post('link/verify')
  @ApiOperation({
    summary:
      'Verify a signed challenge and link (or upgrade to) an external wallet',
  })
  @ApiResponse({ status: 200, type: WalletResponseDto })
  async verifyLink(
    @CurrentUser() currentUser: RequestUser,
    @Body() dto: VerifyLinkDto,
  ): Promise<WalletResponseDto> {
    await this.walletsService.verifyAndLinkExternalWallet(
      currentUser.id,
      dto.nonce,
      dto.address,
      dto.signature,
    );
    const view = await this.walletsService.getWalletStatus(currentUser.id);
    return WalletResponseDto.fromView(view);
  }

  @Post(':userId/fund')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary:
      'Admin-only: credit a custodial wallet (reason required, audited)',
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
