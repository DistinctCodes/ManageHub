import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Payment } from "../entities/payment.entity";
import { PaymentStatus } from "../enums/payment-status.enum";
import { Booking } from "../../bookings/entities/booking.entity";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class InitiatePaymentProvider {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly configService: ConfigService,
  ) {}

  async initiatePayment(userId: string, bookingId: string) {
    const booking = await this.bookingRepo.findOne({
      where: { id: bookingId, userId },
      relations: ["user"],
    });

    if (!booking) {
      throw new ForbiddenException("Booking not found or not owned by user");
    }

    if (booking.status !== "CONFIRMED") {
      throw new BadRequestException("Payment can only be initiated for confirmed bookings");
    }

    const existingSuccess = await this.paymentRepo.findOne({
      where: { bookingId, status: PaymentStatus.SUCCESS },
    });
    if (existingSuccess) {
      throw new ConflictException("Payment already completed for this booking");
    }

    const reference = `MH-${Date.now()}-${bookingId}`;
    const secret = this.configService.get<string>("PAYSTACK_SECRET_KEY");
    const callbackUrl = this.configService.get<string>("PAYSTACK_CALLBACK_URL");

    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: booking.user.email,
        amount: booking.totalAmountKobo,
        reference,
        callback_url: callbackUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/json",
        },
      },
    );

    const { authorization_url } = response.data.data;

    const payment = this.paymentRepo.create({
      reference,
      amountKobo: booking.totalAmountKobo,
      status: PaymentStatus.PENDING,
      userId,
      bookingId,
    });
    await this.paymentRepo.save(payment);

    return {
      success: true,
      data: {
        authorizationUrl: authorization_url,
        reference,
      },
    };
  }
}
