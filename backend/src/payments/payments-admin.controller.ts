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
import { ReconciliationService } from './reconciliation.service';
import { RefundsService } from './refunds.service';
import { AdminActionLogService } from '../admin-audit/admin-action-log.service';
import { AdminActionType } from '../admin-audit/admin-action-type.enum';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { ResolvePaymentManuallyDto } from './dto/resolve-payment-manually.dto';
import { VoidPaymentDto } from './dto/void-payment.dto';
import { CreateRefundDto } from './dto/create-refund.dto';
import {
  RefundResponseDto,
  RequestRefundResponseDto,
} from './dto/refund-response.dto';

/**
 * Admin-only payment recovery/refund actions (issue #1572). Every mutating
 * action here requires a reason, which is logged (Payment#manualReviewReason
 * for the recovery actions) — bounded manual intervention, never a silent
 * bypass of the state machine.
 */
@ApiTags('payments-admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('payments/admin')
export class PaymentsAdminController {
  constructor(
    private readonly reconciliationService: ReconciliationService,
    private readonly refundsService: RefundsService,
    private readonly audit: AdminActionLogService,
  ) {}

  @Get('manual-review')
  @ApiOperation({
    summary: 'List payments awaiting manual review, oldest first',
  })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async listManualReview(): Promise<PaymentResponseDto[]> {
    const payments = await this.reconciliationService.listManualReview();
    return payments.map((payment) => PaymentResponseDto.fromEntity(payment));
  }

  @Get('metrics')
  @ApiOperation({
    summary:
      'Reconciliation metrics — manual-review queue depth and alert status',
  })
  getMetrics() {
    return this.reconciliationService.getMetrics();
  }

  @Post(':id/force-reconcile')
  @ApiOperation({
    summary:
      'Immediately re-verify one payment against the provider, bypassing the due-schedule',
  })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async forceReconcile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PaymentResponseDto> {
    const payment = await this.reconciliationService.forceReconcileNow(id);
    return PaymentResponseDto.fromEntity(payment);
  }

  @Post(':id/resolve-manually')
  @ApiOperation({
    summary:
      'Resolve a MANUAL_REVIEW payment by hand (reason required, audited)',
  })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async resolveManually(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolvePaymentManuallyDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<PaymentResponseDto> {
    const payment = await this.reconciliationService.resolveManually(
      id,
      dto.resolution,
      dto.reason,
    );
    await this.audit.record({
      actorId: currentUser.id,
      action: AdminActionType.PAYMENT_RESOLVE_MANUALLY,
      targetType: 'Payment',
      targetId: id,
      detail: `Resolution: ${dto.resolution} - ${dto.reason}`,
    });
    return PaymentResponseDto.fromEntity(payment);
  }

  @Post(':id/void')
  @ApiOperation({
    summary:
      'Void a MANUAL_REVIEW payment without resolving it (reason required, audited)',
  })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async void(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VoidPaymentDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<PaymentResponseDto> {
    const payment = await this.reconciliationService.void(id, dto.reason);
    await this.audit.record({
      actorId: currentUser.id,
      action: AdminActionType.PAYMENT_VOID,
      targetType: 'Payment',
      targetId: id,
      detail: dto.reason,
    });
    return PaymentResponseDto.fromEntity(payment);
  }

  @Post(':id/refunds')
  @ApiOperation({
    summary:
      'Issue a (partial) refund against a CONFIRMED/PARTIALLY_REFUNDED payment',
  })
  @ApiResponse({ status: 201, type: RequestRefundResponseDto })
  async requestRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateRefundDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<RequestRefundResponseDto> {
    const { payment, refund } = await this.refundsService.requestRefund(
      id,
      dto.amount,
      dto.reason,
      currentUser.id,
    );
    return {
      payment: PaymentResponseDto.fromEntity(payment),
      refund: refund as unknown as RefundResponseDto,
    };
  }
}
