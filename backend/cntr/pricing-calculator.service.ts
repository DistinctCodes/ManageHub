/**
 * Result of a booking cost calculation.
 */
export interface BookingCostResult {
  baseAmount: number;
  discount: number;
  tax: number;
  total: number;
}

/**
 * Pricing calculator service for workspace bookings.
 * All amounts are in kobo (smallest currency unit).
 * Uses integer arithmetic with Math.round to avoid floating-point errors.
 */
export class PricingCalculator {
  /**
   * Calculates the total cost of a booking including discounts and VAT.
   *
   * @param ratePerHourKobo - Hourly rate in kobo (integer)
   * @param startDate - Booking start date
   * @param endDate - Booking end date
   * @param discountPercent - Discount percentage (0–100, default 0)
   * @returns BookingCostResult with baseAmount, discount, tax, and total
   * @throws RangeError if discountPercent is outside 0–100
   */
  static calculateBookingCost(
    ratePerHourKobo: number,
    startDate: Date,
    endDate: Date,
    discountPercent: number = 0,
  ): BookingCostResult {
    // Validate discount percentage
    if (discountPercent < 0 || discountPercent > 100) {
      throw new RangeError(
        `Discount percent must be between 0 and 100, got ${discountPercent}`,
      );
    }

    // Calculate hours between start and end dates
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    const milliseconds = endTime - startTime;
    const hours = milliseconds / (1000 * 60 * 60);

    // Calculate base amount (rate × hours, rounded)
    const baseAmount = Math.round(ratePerHourKobo * hours);

    // Calculate discount amount (baseAmount × discountPercent / 100, rounded)
    const discount = Math.round(baseAmount * (discountPercent / 100));

    // Calculate subtotal after discount
    const subtotal = baseAmount - discount;

    // Calculate VAT (7.5% on subtotal, rounded)
    const VAT_RATE = 0.075;
    const tax = Math.round(subtotal * VAT_RATE);

    // Calculate total (baseAmount - discount + tax)
    const total = baseAmount - discount + tax;

    return {
      baseAmount,
      discount,
      tax,
      total,
    };
  }
}
