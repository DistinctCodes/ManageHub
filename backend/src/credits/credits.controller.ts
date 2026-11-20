import {
  BadRequestException,
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
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { PaymentsService } from '../payments/payments.service';
import { CreditsService } from './credits.service';
import { LedgerService } from './ledger.service';
import {
  METERED_USAGE_PAGE_DEFAULT_LIMIT,
  METERED_USAGE_PAGE_MAX_LIMIT,
  MeteredUsageService,
} from './metered-usage.service';
import { PaymentCreditsService } from './payment-credits.service';
import { ChargeCreditsDto } from './dto/charge-credits.dto';
import { RecordMeteredUsageDto } from './dto/record-metered-usage.dto';
import {
  ChargeCreditsResponseDto,
  CreditBalanceResponseDto,
  LedgerAccountResponseDto,
  LedgerEntryResponseDto,
  LedgerTransactionResponseDto,
  MeteredUsagePageResponseDto,
  MeteredUsageResponseDto,
  PaymentCreditApplicationResponseDto,
} from './dto/credits-response.dto';
import { CreditsUsageWriteGuard } from './credits-usage-write.guard';

interface CreditStatementPage {
  entries: LedgerEntryResponseDto[];
  total: number;
  page: number;
  pageSize: number;
}

function parsePositiveInt(
  value: string | undefined,
  fallback: number,
  name: string,
  max: number,
): number {
  if (value === undefined || value === '') {
    return fallback;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException(`${name} must be a positive integer`);
  }
  return Math.min(parsed, max);
}

function parseUsagePageLimit(limit?: string): number {
  if (limit === undefined || limit === '') {
    return METERED_USAGE_PAGE_DEFAULT_LIMIT;
  }
  const parsed = Number(limit);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new BadRequestException('limit must be a positive integer');
  }
  return Math.min(parsed, METERED_USAGE_PAGE_MAX_LIMIT);
}

function parseUsageDate(value: string, name: 'from' | 'to'): Date {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const parsed = new Date(
    dateOnly && name === 'to' ? `${value}T23:59:59.999Z` : value,
  );
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`${name} must be a valid ISO date`);
  }
  return parsed;
}

@ApiTags('credits')
@ApiBearerAuth()
@Controller('credits')
export class CreditsController {
  constructor(
    private readonly credits: CreditsService,
    private readonly ledger: LedgerService,
    private readonly usage: MeteredUsageService,
    private readonly paymentCredits: PaymentCreditsService,
    private readonly payments: PaymentsService,
  ) {}

  @Post('charge')
  @UseGuards(CreditsUsageWriteGuard)
  @ApiHeader({
    name: 'X-Service-Key',
    required: false,
    description: 'Scoped CREDITS_USAGE_API_KEY credential for usage writes',
  })
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
    @CurrentUser() currentUser: RequestUser | undefined,
  ): Promise<ChargeCreditsResponseDto> {
    const result = await this.credits.charge({
      userId: dto.userId,
      amount: dto.amount,
      currency: dto.currency,
      reference: dto.reference,
      reason: dto.reason,
      metadata: dto.metadata ?? null,
      actorId: currentUser?.id ?? null,
    });

    return {
      transaction: LedgerTransactionResponseDto.fromEntity(result.transaction),
      posted: result.posted,
      balanceAfter: result.balanceAfter,
      currency: result.currency,
    };
  }

  /**
   * Prices a usage reading and charges it. This route accepts the scoped
   * usage-write credential or an administrator JWT.
   */
  @Post('usage')
  @UseGuards(CreditsUsageWriteGuard)
  @ApiHeader({
    name: 'X-Service-Key',
    required: false,
    description: 'Scoped CREDITS_USAGE_API_KEY credential for usage writes',
  })
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

  @Get('accounts')
  @ApiOperation({ summary: 'Your own credit accounts' })
  @ApiResponse({ status: 200, type: [LedgerAccountResponseDto] })
  async myAccounts(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<LedgerAccountResponseDto[]> {
    const accounts = await this.ledger.listAccountsForOwner(currentUser.id);
    return accounts.map((account) =>
      LedgerAccountResponseDto.fromEntity(account),
    );
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Your own recent ledger entries, newest first',
    description:
      'The append-only movements behind the balance — every charge, top-up ' +
      'and adjustment, with nothing ever edited or deleted.',
  })
  @ApiQuery({ name: 'currency', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'A page of ledger entries' })
  async myStatement(
    @CurrentUser() currentUser: RequestUser,
    @Query('currency') currency?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ): Promise<CreditStatementPage> {
    const pageNumber = parsePositiveInt(page, 1, 'page', 100000);
    const size = parsePositiveInt(pageSize, 20, 'pageSize', 100);
    const view = await this.credits.getBalance(currentUser.id, currency);
    if (!view.accountId) {
      return { entries: [], total: 0, page: pageNumber, pageSize: size };
    }
    const result = await this.ledger.listEntriesPage(
      view.accountId,
      pageNumber,
      size,
    );
    return {
      entries: result.entries.map((entry) =>
        LedgerEntryResponseDto.fromEntity(entry),
      ),
      total: result.total,
      page: pageNumber,
      pageSize: size,
    };
  }

  @Get('usage')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Your own metered usage history, newest first',
    description:
      'Cursor-paginated: pass `cursor` from the previous page to fetch the ' +
      'next one, and `nextCursor` is null on the last page. `from`/`to` bound ' +
      'the inclusive created-at range.',
  })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'cursor',
    required: false,
    type: String,
    description: 'Opaque cursor from the previous page',
  })
  @ApiQuery({ name: 'from', required: false, description: 'Inclusive ISO start' })
  @ApiQuery({ name: 'to', required: false, description: 'Inclusive ISO end' })
  @ApiResponse({ status: 200, type: MeteredUsagePageResponseDto })
  async myUsage(
    @CurrentUser() currentUser: RequestUser,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<MeteredUsagePageResponseDto> {
    const fromDate = from ? parseUsageDate(from, 'from') : undefined;
    const toDate = to ? parseUsageDate(to, 'to') : undefined;
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        '"from" must be earlier than or equal to "to"',
      );
    }
    const page = await this.usage.listForUser({
      userId: currentUser.id,
      limit: parseUsagePageLimit(limit),
      cursor,
      from: fromDate,
      to: toDate,
    });
    return {
      data: page.events.map((event) =>
        MeteredUsageResponseDto.fromEntity(event),
      ),
      nextCursor: page.nextCursor,
    };
  }

  /**
   * Applies a CONFIRMED payment's credit-ledger effect right now instead
   * of waiting for the sweep — the fast path for a checkout return, so a
   * top-up is spendable immediately. Authorization reuses
   * PaymentsService.findOne, so a member can only ever apply their own
   * payment (an admin, any).
   */
  @Post('payments/:paymentId/apply')
  @UseGuards(JwtAuthGuard)
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
