import { Injectable, UnauthorizedException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Payment } from "../entities/payment.entity";
import { PaymentStatus } from "../enums/payment-status.enum";
import { Booking } from "../../bookings/entities/booking.entity";
import * as crypto from "crypto";

@Injectable()
export class HandleWebhookProvider {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  verifySignature(rawBody: Buffer, signature: string, secret: string): void {
    const expected = crypto
      .createHmac("sha512", secret)
      .update(rawBody)
      .digest("hex");

    if (expected !== signature) {
      throw new UnauthorizedException("Invalid Paystack signature");
    }
  }

  async handleEvent(event: any): Promise<{ received: true }> {
    const { event: type, data } = event;

    if (type === "charge.success") {
      const payment = await this.paymentRepo.findOne({
        where: { reference: data.reference },
        relations: ["booking"],
      });
      if (payment) {
        payment.status = PaymentStatus.SUCCESS;
        payment.paidAt = new Date();
        await this.paymentRepo.save(payment);

        if (payment.booking && payment.booking.status === "PENDING") {
          payment.booking.status = "CONFIRMED";
          await this.bookingRepo.save(payment.booking);
        }
      }
      return { received: true };
    }

    if (type === "charge.failed") {
      const payment = await this.paymentRepo.findOne({
        where: { reference: data.reference },
      });
      if (payment) {
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepo.save(payment);
      }
      return { received: true };
    }

    // Ignore unrecognised events gracefully
    return { received: true };
  }
}
