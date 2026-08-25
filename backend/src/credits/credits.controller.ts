import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { PaymentsService } from '../payments/payments.service';
import { CreditsService } from './credits.service';
import { LedgerService } from './ledger.service';
import { MeteredUsageService } from './metered-usage.service';
import { PaymentCreditsService } from './payment-credits.service';
import { ChargeCreditsDto } from './dto/charge-credits.dto';
import { RecordMeteredUsageDto } from './dto/record-metered-usage.dto';
import {
  ChargeCreditsResponseDto,
  CreditBalanceResponseDto,
  LedgerEntryResponseDto,
  LedgerTransactionResponseDto,
  MeteredUsageResponseDto,
  PaymentCreditApplicationResponseDto,
} from './dto/credits-response.dto';

@ApiTags('credits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('credits')
export class CreditsController {
  constructor(
    private readonly credits: CreditsService,
    private readonly ledger: LedgerService,
    private readonly usage: MeteredUsageService,
    private readonly paymentCredits: PaymentCreditsService,
    private readonly payments: PaymentsService,
  ) {}

  /**
   * The internal spend boundary. Restricted to the ADMIN role because it
   * is meant to be called by resource-usage features running with a
   * service identity, never by an end user against their own balance — a
   * member must not be able to name the amount they are charged. (In a
   * deployment with a service-mesh identity, this is the endpoint to move
   * behind a service token; the role guard is the closest primitive this
   * codebase has today.)
   */
  @Post('charge')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Charge a member’s credit balance (internal, service-to-service)',
    description:
      'Synchronous, cheap, and never touches a payment rail. Idempotent on ' +
      '`reference`: replaying it returns the original charge with ' +
      '`posted: false`. Rejected with 409 if it would breach the account’s ' +
      'overdraft ceiling — including when it only breaches it in ' +
      'combination with a concurrent charge, since the check is made under ' +
      'the account’s row lock.',
  })
  @ApiResponse({ status: 201, type: ChargeCreditsResponseDto })
  async charge(
    @Body() dto: ChargeCreditsDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<ChargeCreditsResponseDto> {
    const result = await this.credits.charge({
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      reference: dto.reference,
      reason: dto.reason,
      metadata: dto.metadata ?? null,
      actorId: currentUser.id,
    });

    return {
      transaction: LedgerTransactionResponseDto.fromEntity(result.transaction),
      posted: result.posted,
      balanceAfter: result.balanceAfter,
      currency: result.currency,
    };
  }

  /**
   * The metered call site for the charge path: prices a usage reading and
   * charges it. Same service-identity reasoning as `charge` above.
   */
  @Post('usage')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Record metered resource usage and charge it to credit',
    description:
      'Priced as units × unitPrice in minor units. Idempotent on ' +
      '`usageReference` — a retried meter reading records once and charges ' +
      'once.',
  })
  @ApiResponse({ status: 201, type: MeteredUsageResponseDto })
  async recordUsage(
    @Body() dto: RecordMeteredUsageDto,
  ): Promise<MeteredUsageResponseDto> {
    const { event, charged } = await this.usage.recordUsage({
      userId: dto.userId,
      resource: dto.resource,
      units: dto.units,
      unitPrice: dto.unitPrice,
      currency: dto.currency,
      usageReference: dto.usageReference,
    });
    return MeteredUsageResponseDto.fromEntity(event, charged);
  }

  @Get('balance')
  @ApiOperation({ summary: 'Your own credit balance' })
  @ApiResponse({ status: 200, type: CreditBalanceResponseDto })
  async myBalance(
    @CurrentUser() currentUser: RequestUser,
    @Query('currency') currency?: string,
  ): Promise<CreditBalanceResponseDto> {
    const view = await this.credits.getBalance(currentUser.id, currency);
    return CreditBalanceResponseDto.fromView(view);
  }

  @Get('statement')
  @ApiOperation({
    summary: 'Your own recent ledger entries, newest first',
    description:
      'The append-only movements behind the balance — every charge, top-up ' +
      'and adjustment, with nothing ever edited or deleted.',
  })
  @ApiResponse({ status: 200, type: [LedgerEntryResponseDto] })
  async myStatement(
    @CurrentUser() currentUser: RequestUser,
    @Query('currency') currency?: string,
  ): Promise<LedgerEntryResponseDto[]> {
    const view = await this.credits.getBalance(currentUser.id, currency);
    if (!view.accountId) {
      return [];
    }
    const entries = await this.ledger.listEntries(view.accountId);
    return entries.map((entry) => LedgerEntryResponseDto.fromEntity(entry));
  }

  @Get('usage')
  @ApiOperation({ summary: 'Your own metered usage history, newest first' })
  @ApiResponse({ status: 200, type: [MeteredUsageResponseDto] })
  async myUsage(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<MeteredUsageResponseDto[]> {
    const events = await this.usage.listForUser(currentUser.id);
    return events.map((event) => MeteredUsageResponseDto.fromEntity(event));
  }

  /**
   * Applies a CONFIRMED payment's credit-ledger effect right now instead
   * of waiting for the sweep — the fast path for a checkout return, so a
   * top-up is spendable immediately. Authorization reuses
   * PaymentsService.findOne, so a member can only ever apply their own
   * payment (an admin, any).
   */
  @Post('payments/:paymentId/apply')
  @ApiOperation({
    summary: 'Apply a confirmed payment to the credit ledger now',
    description:
      'Idempotent: a payment already applied is returned unchanged. Only ' +
      'works on a CONFIRMED payment that is either marked as a credit ' +
      'top-up or has a revenue split attached.',
  })
  @ApiResponse({ status: 201, type: PaymentCreditApplicationResponseDto })
  async applyPayment(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<PaymentCreditApplicationResponseDto> {
    const payment = await this.payments.findOne(paymentId, currentUser);
    const application = await this.paymentCredits.applyPayment(payment.id);
    return PaymentCreditApplicationResponseDto.fromEntity(application);
  }
}
