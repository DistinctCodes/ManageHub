import { Controller, Get, Param } from "@nestjs/common";
import { PaymentsService } from "./providers/payments.service";
import { Payment } from "./entities/payment.entity";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async getAll(): Promise<Payment[]> {
    return this.paymentsService.findAll();
  }

  @Get(":id")
  async getOne(@Param("id") id: string): Promise<Payment | null> {
    return this.paymentsService.findOne(id);
  }
}
