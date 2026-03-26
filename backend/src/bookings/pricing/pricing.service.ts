import { Injectable } from '@nestjs/common';
import { PlanType } from '../enums/plan-type.enum';

const PLAN_WORKING_HOURS = 8;

const PLAN_DAYS: Record<PlanType, number> = {
  [PlanType.DAILY]: 1,
  [PlanType.WEEKLY]: 5,
  [PlanType.MONTHLY]: 22,
  [PlanType.QUARTERLY]: 66,
  [PlanType.YEARLY]: 264,
};

const PLAN_DISCOUNT: Record<PlanType, number> = {
  [PlanType.DAILY]: 0,
  [PlanType.WEEKLY]: 0.05,
  [PlanType.MONTHLY]: 0.1,
  [PlanType.QUARTERLY]: 0.15,
  [PlanType.YEARLY]: 0.2,
};

@Injectable()
export class PricingService {
  /**
   * Calculate total booking amount in kobo.
   * For DAILY plan the actual calendar days between startDate and endDate are used.
   * For all other plans the fixed multipliers are used.
   */
  calculateAmount(
    hourlyRateKobo: number,
    planType: PlanType,
    seatCount: number,
    startDate: string,
    endDate: string,
  ): number {
    let days: number;

    if (planType === PlanType.DAILY) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    } else {
      days = PLAN_DAYS[planType];
    }

    const gross = hourlyRateKobo * PLAN_WORKING_HOURS * days * seatCount;
    const discount = PLAN_DISCOUNT[planType];
    return Math.floor(gross * (1 - discount));
  }

  getPlanSummary(planType: PlanType): { days: number; discountPct: number } {
    return {
      days: PLAN_DAYS[planType],
      discountPct: PLAN_DISCOUNT[planType] * 100,
    };
  }
}