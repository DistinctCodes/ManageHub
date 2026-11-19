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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { PaymentsService } from './payments.service';
import { PaymentConfirmationService } from './payment-confirmation.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';
import { VerifyReturnResponseDto } from './dto/verify-return-response.dto';
import { Throttle } from '@nestjs/throttler';
import { withSpan } from '../common/tracing';
import { IdempotencyKey } from './idempotency-key.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly confirmationService: PaymentConfirmationService,
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
        return PaymentResponseDto.fromEntity(payment);
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
    return PaymentResponseDto.fromEntity(payment);
  }

  @Get()
  @ApiOperation({ summary: 'List payments (own for users, all for admins)' })
  @ApiResponse({ status: 200, type: [PaymentResponseDto] })
  async findAll(
    @CurrentUser() currentUser: RequestUser,
  ): Promise<PaymentResponseDto[]> {
    const payments = await this.paymentsService.findAll(currentUser);
    return payments.map((payment) => PaymentResponseDto.fromEntity(payment));
  }

  @Post(':id/cancel')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: 'Cancel a payment you own (pre-confirmation states only)',
    description:
      'Owner-only. Cancelling releases the booking unique index so the ' +
      'booking can be paid again. Confirmed/terminal payments cannot be ' +
      'cancelled and are rejected with 422.',
  })
  @ApiResponse({ status: 200, type: PaymentResponseDto })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<PaymentResponseDto> {
    return withSpan(
      'payments.controller.cancel',
      async () => {
        const payment = await this.paymentsService.cancel(id, currentUser);
        return PaymentResponseDto.fromEntity(payment);
      },
      { 'payment.id': id },
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
          payment: PaymentResponseDto.fromEntity(updated),
          verified,
        };
      },
      { 'payment.id': id },
    );
  }
}
