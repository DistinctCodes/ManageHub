import { BadRequestException, ForbiddenException } from '@nestjs/common';

/** #2086: the payment amount must equal the booking's server-side price. */
export function assertAmountMatchesBooking(amount: number | string, bookingPrice: number | string): void {
  if (Number(amount) !== Number(bookingPrice)) {
    throw new BadRequestException('Payment amount does not match the booking price');
  }
}

/** #2087: only the booking's owner may initiate a payment for it. */
export function assertBookingOwner(booking: { userId: string }, userId: string): void {
  if (booking.userId !== userId) throw new ForbiddenException('You cannot pay for this booking');
}
