import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  Res,
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
import { CreditsService } from './credits.service';
import { LedgerService } from './ledger.service';
import { PaymentCreditsService } from './payment-credits.service';
import { RevenueSplitService } from './revenue-split.service';
import { SettlementService } from './settlement.service';
import { AdminActionLogService } from '../admin-audit/admin-action-log.service';
import { AdminActionType } from '../admin-audit/admin-action-type.enum';
import { SettlementBatchStatus } from './enums/settlement-batch-status.enum';
import { Workbook } from 'exceljs';
import { Response } from 'express';
import {
  AbandonSettlementBatchDto,
  AdjustCreditsDto,
  AttachSplitConfigDto,
  CreateLedgerAccountDto,
  CreateSettlementBatchDto,
  UpdateLedgerAccountDto,
} from './dto/ledger-admin.dto';
import {
  CreateRevenueSplitConfigDto,
  PreviewSplitDto,
  ReplaceSplitRecipientsDto,
  SetSplitConfigActiveDto,
} from './dto/revenue-split-config.dto';
import {
  CreditBalanceResponseDto,
  LedgerAccountResponseDto,
  LedgerTransactionResponseDto,
  PaymentCreditApplicationResponseDto,
} from './dto/credits-response.dto';
import {
  RevenueSplitConfigResponseDto,
  SplitPreviewResponseDto,
} from './dto/revenue-split-response.dto';
import {
  SettlementBatchBreakdownResponseDto,
  SettlementBatchResponseDto,
} from './dto/settlement-response.dto';

/**
 * Admin surface for the credit ledger (issue #1575): account policy,
 * revenue split configuration, and settlement visibility/recovery.
 *
 * Everything that can move value is either idempotent or requires a
 * reason, and nothing here can edit a posted entry — a correction is
 * always a new transaction, so the audit trail only ever grows.
 */
@ApiTags('credits-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('credits/admin')
export class CreditsAdminController {
  constructor(
    private readonly credits: CreditsService,
    private readonly ledger: LedgerService,
    private readonly splits: RevenueSplitService,
    private readonly settlement: SettlementService,
    private readonly paymentCredits: PaymentCreditsService,
    private readonly audit: AdminActionLogService,
  ) {}

  // ── accounts ───────────────────────────────────────────────────────────

  @Get('accounts')
  @ApiOperation({ summary: 'List ledger accounts' })
  @ApiResponse({ status: 200, type: [LedgerAccountResponseDto] })
  async listAccounts(
    @Query('currency') currency?: string,
  ): Promise<LedgerAccountResponseDto[]> {
    const accounts = await this.ledger.listAccounts(currency);
    return accounts.map((account) =>
      LedgerAccountResponseDto.fromEntity(account),
    );
  }

  @Get('accounts/export')
  @ApiOperation({ summary: 'Export ledger accounts as xlsx' })
  async exportAccounts(
    @Query('currency') currency: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ): Promise<Buffer> {
    const accounts = await this.ledger.listAccounts(currency);
    const workbook = new Workbook();
    const sheet = workbook.addWorksheet('ledger-accounts');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 40 },
      { header: 'Kind', key: 'kind', width: 18 },
      { header: 'Owner ID', key: 'ownerId', width: 40 },
      { header: 'Currency', key: 'currency', width: 12 },
      { header: 'Balance', key: 'balance', width: 14 },
      { header: 'Overdraft', key: 'overdraftLimit', width: 14 },
      { header: 'External payout address', key: 'externalPayoutAddress', width: 40 },
      { header: 'Frozen', key: 'frozen', width: 10 },
      { header: 'Label', key: 'label', width: 24 },
    ];
    sheet.addRows(
      accounts.map((account) => ({
        id: account.id,
        kind: account.kind,
        ownerId: account.ownerId ?? '',
        currency: account.currency,
        balance: account.balance,
        overdraftLimit: account.overdraftLimit,
        externalPayoutAddress: account.externalPayoutAddress ?? '',
        frozen: account.frozen,
        label: account.label ?? '',
      })),
    );

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="ledger-accounts.xlsx"');
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  @Post('accounts')
  @ApiOperation({
    summary: 'Create (or fetch) a ledger account',
    description:
      'Idempotent on (kind, ownerId, currency). Give a payable account an ' +
      'externalPayoutAddress to make its balance eligible for an ' +
      'off-platform settlement batch.',
  })
  @ApiResponse({ status: 201, type: LedgerAccountResponseDto })
  async createAccount(
    @Body() dto: CreateLedgerAccountDto,
  ): Promise<LedgerAccountResponseDto> {
    const account = await this.ledger.getOrCreateAccount({
      kind: dto.kind,
      ownerId: dto.ownerId ?? null,
      currency: dto.currency ?? this.credits.defaultCurrency(),
      overdraftLimit: dto.overdraftLimit,
      externalPayoutAddress: dto.externalPayoutAddress ?? null,
      label: dto.label ?? null,
    });
    return LedgerAccountResponseDto.fromEntity(account);
  }

  @Patch('accounts/:id')
  @ApiOperation({
    summary: 'Update an account’s policy (overdraft, payout address, freeze)',
    description:
      'Balance is deliberately not settable here — it moves only by posting ' +
      'ledger entries, so no code path can change it without an audit trail.',
  })
  @ApiResponse({ status: 200, type: LedgerAccountResponseDto })
  async updateAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLedgerAccountDto,
  ): Promise<LedgerAccountResponseDto> {
    const account = await this.ledger.updateAccountPolicy(id, {
      overdraftLimit: dto.overdraftLimit,
      externalPayoutAddress:
        dto.externalPayoutAddress === undefined
          ? undefined
          : dto.externalPayoutAddress || null,
      frozen: dto.frozen,
      label: dto.label,
    });
    return LedgerAccountResponseDto.fromEntity(account);
  }

  @Get('balances/:userId')
  @ApiOperation({ summary: 'A member’s credit balance' })
  @ApiResponse({ status: 200, type: CreditBalanceResponseDto })
  async getBalance(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query('currency') currency?: string,
  ): Promise<CreditBalanceResponseDto> {
    const view = await this.credits.getBalance(userId, currency);
    return CreditBalanceResponseDto.fromView(view);
  }

  @Post('adjustments')
  @ApiOperation({
    summary: 'Adjust a member’s credit balance (reason required, audited)',
  })
  @ApiResponse({ status: 201, type: LedgerTransactionResponseDto })
  async adjust(
    @Body() dto: AdjustCreditsDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<LedgerTransactionResponseDto> {
    const { transaction } = await this.credits.adjust({
      userId: dto.userId,
      delta: dto.delta,
      currency: dto.currency,
      reference: dto.reference,
      reason: dto.reason,
      actorId: currentUser.id,
    });
    return LedgerTransactionResponseDto.fromEntity(transaction);
  }

  @Get('ledger/integrity')
  @ApiOperation({
    summary: 'Ledger integrity report',
    description:
      'Re-derives every account balance from the append-only entries and ' +
      'reports drift, plus any transaction whose debits and credits do not ' +
      'cancel. Both lists empty is the healthy state.',
  })
  checkIntegrity(@Query('currency') currency?: string) {
    return this.ledger.checkIntegrity(currency);
  }

  // ── revenue splits ─────────────────────────────────────────────────────

  @Post('splits')
  @ApiOperation({
    summary: 'Create a revenue split config',
    description:
      'Basis points must sum to exactly 10000 and every recipient must have ' +
      'exactly one of accountId / externalAddress — both rejected here with ' +
      'a 400 rather than discovered during a settlement run.',
  })
  @ApiResponse({ status: 201, type: RevenueSplitConfigResponseDto })
  async createSplit(
    @Body() dto: CreateRevenueSplitConfigDto,
  ): Promise<RevenueSplitConfigResponseDto> {
    const config = await this.splits.createConfig({
      name: dto.name,
      description: dto.description ?? null,
      recipients: dto.recipients,
    });
    return RevenueSplitConfigResponseDto.fromEntity(config);
  }

  @Get('splits')
  @ApiOperation({ summary: 'List revenue split configs' })
  @ApiResponse({ status: 200, type: [RevenueSplitConfigResponseDto] })
  async listSplits(): Promise<RevenueSplitConfigResponseDto[]> {
    const configs = await this.splits.listConfigs();
    return configs.map((config) =>
      RevenueSplitConfigResponseDto.fromEntity(config),
    );
  }

  @Get('splits/:id')
  @ApiOperation({ summary: 'Get one revenue split config' })
  @ApiResponse({ status: 200, type: RevenueSplitConfigResponseDto })
  async getSplit(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RevenueSplitConfigResponseDto> {
    const config = await this.splits.getConfig(id);
    return RevenueSplitConfigResponseDto.fromEntity(config);
  }

  @Put('splits/:id/recipients')
  @ApiOperation({
    summary: 'Replace a config’s recipients',
    description:
      'Wholesale replacement, because "sums to 10000" is a property of the ' +
      'set — there is no valid way to edit one share in isolation.',
  })
  @ApiResponse({ status: 200, type: RevenueSplitConfigResponseDto })
  async replaceRecipients(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceSplitRecipientsDto,
  ): Promise<RevenueSplitConfigResponseDto> {
    const config = await this.splits.replaceRecipients(id, dto.recipients);
    return RevenueSplitConfigResponseDto.fromEntity(config);
  }

  @Post('splits/:id/active')
  @ApiOperation({ summary: 'Activate or deactivate a config' })
  @ApiResponse({ status: 200, type: RevenueSplitConfigResponseDto })
  async setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetSplitConfigActiveDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<RevenueSplitConfigResponseDto> {
    const config = await this.splits.setActive(id, dto.active);
    await this.audit.record({
      actorId: currentUser.id,
      action: dto.active
        ? AdminActionType.SPLIT_CONFIG_ACTIVATE
        : AdminActionType.SPLIT_CONFIG_DEACTIVATE,
      targetType: 'RevenueSplitConfig',
      targetId: id,
      detail: config.name,
    });
    return RevenueSplitConfigResponseDto.fromEntity(config);
  }

  @Post('splits/preview')
  @ApiOperation({
    summary: 'Preview what a config would allocate for an amount',
    description:
      'Posts nothing. Shows each recipient’s share and how many minor units ' +
      'of the rounding remainder it received, so the largest-remainder rule ' +
      'is inspectable — the total always equals the input amount exactly.',
  })
  @ApiResponse({ status: 200, type: SplitPreviewResponseDto })
  async previewSplit(
    @Body() dto: PreviewSplitDto,
  ): Promise<SplitPreviewResponseDto> {
    const shares = await this.splits.computeForAmount(dto.configId, dto.amount);
    return SplitPreviewResponseDto.fromShares(dto.amount, shares);
  }

  // ── payment integration ────────────────────────────────────────────────

  @Post('payments/:paymentId/split-config')
  @ApiOperation({
    summary: 'Attach a revenue split config to a payment',
    description:
      'Once the payment CONFIRMS, its amount is distributed across the ' +
      'config as ledger entries. Refused if the payment has already been ' +
      'applied, or if the config has external-address recipients (those ' +
      'belong to a settlement batch, not to a payment).',
  })
  @ApiResponse({ status: 201, type: PaymentCreditApplicationResponseDto })
  async attachSplitConfig(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
    @Body() dto: AttachSplitConfigDto,
  ): Promise<PaymentCreditApplicationResponseDto> {
    const application = await this.paymentCredits.attachSplitConfig(
      paymentId,
      dto.splitConfigId,
    );
    return PaymentCreditApplicationResponseDto.fromEntity(application);
  }

  @Post('payments/:paymentId/top-up')
  @ApiOperation({
    summary: 'Mark a payment as funding the payer’s credit balance',
    description:
      'The alternative to setting `metadata.purpose = "CREDIT_TOP_UP"` at ' +
      'initiation time, for a caller that could not.',
  })
  @ApiResponse({ status: 201, type: PaymentCreditApplicationResponseDto })
  async markAsTopUp(
    @Param('paymentId', ParseUUIDPipe) paymentId: string,
  ): Promise<PaymentCreditApplicationResponseDto> {
    const application = await this.paymentCredits.markAsTopUp(paymentId);
    return PaymentCreditApplicationResponseDto.fromEntity(application);
  }

  @Post('payments/sweep')
  @ApiOperation({
    summary: 'Run the confirmed-payment credit sweep immediately',
  })
  sweepPayments() {
    return this.paymentCredits.sweepConfirmedPayments();
  }

  // ── settlement ─────────────────────────────────────────────────────────

  @Post('settlement/run')
  @ApiOperation({
    summary: 'Run a full settlement pass now',
    description:
      'Resumes every open batch first, then creates and executes new ones. ' +
      'Safe to call at any time — the same guarantees the scheduled job ' +
      'relies on.',
  })
  runSettlement() {
    return this.settlement.runSettlement();
  }

  @Post('settlement/batches')
  @ApiOperation({
    summary: 'Create one settlement batch explicitly',
    description:
      'With a splitConfigName the batch distributes the revenue account ' +
      'across that config; without one it nets each payable account and ' +
      'pays its own address. Responds with an empty body when there was ' +
      'nothing to settle.',
  })
  @ApiResponse({ status: 201, type: SettlementBatchResponseDto })
  async createBatch(
    @Body() dto: CreateSettlementBatchDto,
  ): Promise<SettlementBatchResponseDto | null> {
    const currency = (
      dto.currency ?? this.credits.defaultCurrency()
    ).toUpperCase();
    const batch = dto.splitConfigName
      ? await this.settlement.createDistributionBatch(
          currency,
          dto.splitConfigName,
        )
      : await this.settlement.createNetPayableBatch(currency);
    return batch ? SettlementBatchResponseDto.fromEntity(batch) : null;
  }

  @Get('settlement/batches')
  @ApiOperation({ summary: 'List settlement batches, newest first' })
  @ApiResponse({ status: 200, type: [SettlementBatchResponseDto] })
  async listBatches(
    @Query('status') status?: SettlementBatchStatus,
  ): Promise<SettlementBatchResponseDto[]> {
    const batches = await this.settlement.listBatches(status);
    return batches.map((batch) => SettlementBatchResponseDto.fromEntity(batch));
  }

  @Get('settlement/batches/:id')
  @ApiOperation({
    summary: 'Full breakdown of one batch',
    description:
      'Entries in, recipients out, and the on-chain transaction reference ' +
      'for every off-platform leg.',
  })
  @ApiResponse({ status: 200, type: SettlementBatchBreakdownResponseDto })
  async getBatch(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SettlementBatchBreakdownResponseDto> {
    const breakdown = await this.settlement.getBatchBreakdown(id);
    return SettlementBatchBreakdownResponseDto.fromBreakdown(breakdown);
  }

  @Post('settlement/batches/:id/execute')
  @ApiOperation({
    summary: 'Advance one batch by a step (submit pending, poll submitted)',
  })
  @ApiResponse({ status: 201, type: SettlementBatchResponseDto })
  async executeBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<SettlementBatchResponseDto> {
    const batch = await this.settlement.executeBatch(id);
    await this.audit.record({
      actorId: currentUser.id,
      action: AdminActionType.SETTLEMENT_BATCH_EXECUTE,
      targetType: 'SettlementBatch',
      targetId: id,
      detail: batch.mode,
    });
    return SettlementBatchResponseDto.fromEntity(batch);
  }

  @Post('settlement/batches/:id/retry')
  @ApiOperation({
    summary: 'Re-queue a batch’s failed payouts',
    description:
      'The idempotency keys are deliberately reused, so the rail dedupes a ' +
      'transfer that actually did land — a retry can never double-pay.',
  })
  @ApiResponse({ status: 201, type: SettlementBatchResponseDto })
  async retryBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<SettlementBatchResponseDto> {
    const batch = await this.settlement.retryBatch(id);
    await this.audit.record({
      actorId: currentUser.id,
      action: AdminActionType.SETTLEMENT_BATCH_RETRY,
      targetType: 'SettlementBatch',
      targetId: id,
      detail: batch.mode,
    });
    return SettlementBatchResponseDto.fromEntity(batch);
  }

  @Post('settlement/batches/:id/abandon')
  @ApiOperation({
    summary: 'Give up on a batch and release its unsettled claims',
    description:
      'Posts nothing: a payout that never happened has no ledger effect to ' +
      'undo, so the balance is still shown as owed and a future batch can ' +
      'pick the entries up again.',
  })
  @ApiResponse({ status: 201, type: SettlementBatchResponseDto })
  async abandonBatch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AbandonSettlementBatchDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<SettlementBatchResponseDto> {
    const batch = await this.settlement.abandonBatch(id, dto.reason);
    await this.audit.record({
      actorId: currentUser.id,
      action: AdminActionType.SETTLEMENT_BATCH_ABANDON,
      targetType: 'SettlementBatch',
      targetId: id,
      detail: dto.reason,
    });
    return SettlementBatchResponseDto.fromEntity(batch);
  }
}
