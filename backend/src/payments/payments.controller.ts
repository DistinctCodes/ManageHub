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
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { PaymentsService } from './payments.service';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import { PaymentResponseDto } from './dto/payment-response.dto';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiOperation({
    summary: 'Initiate a payment (INITIATED -> AWAITING_CONFIRMATION)',
    description:
      'Idempotent via the required Idempotency-Key header: replaying the ' +
      'same key returns the original Payment instead of creating a duplicate.',
  })
  @ApiResponse({ status: 201, type: PaymentResponseDto })
  async initiate(
    @CurrentUser() currentUser: RequestUser,
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() dto: InitiatePaymentDto,
  ): Promise<PaymentResponseDto> {
    const payment = await this.paymentsService.initiate(
      currentUser.id,
      idempotencyKey,
      dto,
    );
    return PaymentResponseDto.fromEntity(payment);
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
}
