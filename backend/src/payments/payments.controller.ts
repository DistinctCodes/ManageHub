import { Controller, Get, Param, Post, Body } from "@nestjs/common";
import { PaymentsService } from "./providers/payments.service";
import { Payment } from "./entities/payment.entity";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { InitiatePaymentProvider } from "./providers/initiate-payment.provider";
import { GetCurrentUser } from "../auth/decorators/get-current-user.decorator";

@Controller("payments")
export class PaymentsController {
      constructor(private readonly initiatePaymentProvider: InitiatePaymentProvider) {}


   @Post("initiate")
  async initiate(
    @Body() dto: InitiatePaymentDto,
    @GetCurrentUser("id") userId: string,
  ) {
    return this.initiatePaymentProvider.initiatePayment(userId, dto.bookingId);
  }

  @Get()
  async getAll(): Promise<Payment[]> {
    return this.paymentsService.findAll();
  }

  @Get(":id")
  async getOne(@Param("id") id: string): Promise<Payment | null> {
    return this.paymentsService.findOne(id);
  }
}
