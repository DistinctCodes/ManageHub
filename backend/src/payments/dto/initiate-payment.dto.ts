import { IsUUID } from "class-validator";

export class InitiatePaymentDto {
  @IsUUID()
  bookingId: string;
}
