import {
  Body,
  Controller,
  Get,
  Optional,
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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { PaymentsService } from './payments.service';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { RefundsService } from './refunds.service';
import { Payment } from './entities/payment.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { VerifyReturnResponseDto } from './dto/verify-return-response.dto';
import { Throttle } from '@nestjs/throttler';
import { withSpan } from '../common/tracing';
import { IdempotencyKey } from './idempotency-key.decorator';

async function toPaymentResponse(
  payment: Payment,
  refundsService?: RefundsService,
): Promise<PaymentResponseDto> {
  if (!refundsService) return PaymentResponseDto.fromEntity(payment);
  const totals = await refundsService.getRefundedAmounts([payment.id]);
  return PaymentResponseDto.fromEntity(payment, totals.get(payment.id) ?? 0);
}

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly confirmationService: PaymentConfirmationService,
    @Optional() private readonly refundsService?: RefundsService,
  ) {}

  @Post('initiate')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Initiate a payment (INITIATED -> AWAITING_CONFIRMATION)',
    description:
      'Idempotent via the required Idempotency-Key header: replaying the ' +
      'same key returns the original Payment instead of creating a duplicate.',
  })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async initiate(
    @CurrentUser() currentUser: RequestUser,
    @IdempotencyKey()
    idempotencyKey: string,
    @Body() dto: InitiatePaymentDto,
  ): Promise<PaymentResponseDto> {
    return withSpan(
      'payments.controller.initiate',
      async () => {
        const payment = await this.paymentsService.initiate(
          currentUser.id,
          idempotencyKey,
          dto,
        );
        return toPaymentResponse(payment, this.refundsService);
      },
      {
        'payment.booking_id': dto.bookingId,
        'payment.rail': dto.rail,
      },
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a payment by id (owner or admin only)' })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentsService.findOne(id, currentUser);
    return toPaymentResponse(payment, this.refundsService);
  }

  @Get()
  @ApiOperation({ summary: 'List payments (own for users, all for admins)' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async findAll(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentsService.findAll(currentUser);
    return Promise.all(
      payments.map((payment) =>
        toPaymentResponse(payment, this.refundsService),
      ),
    );
  }

  @Post(':id/verify-return')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary:
      'Bounded synchronous verify-on-return fast path for the checkout ' +
      'return leg. Never marks a payment CONFIRMED without an ' +
      'authoritative provider response — a timeout returns verified:false ' +
      'with the payment unchanged; the webhook/real-time channel remains ' +
      'authoritative.',
  })
  @ApiResponse({ status: 200, type: VerifyReturnResponseDto })
  async verifyReturn(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<VerifyReturnResponseDto> {
    return withSpan(
      'payments.controller.verifyReturn',
      async () => {
        const payment = await this.paymentsService.findOne(id, currentUser);
        const { payment: updated, verified } =
          await this.confirmationService.verifyOnReturn(payment);

        return {
          payment: await toPaymentResponse(updated, this.refundsService),
          verified,
        };
      },
      { 'payment.id': id },
    );
  }
}
