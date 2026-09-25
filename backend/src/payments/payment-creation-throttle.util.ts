// Per-user/per-IP throttle for the payment creation endpoint in
// payments.controller.ts, using the same shape NestJS's throttler
// module expects for a custom tracker.
export interface ThrottleWindow {
  count: number;
  windowStartedAt: number;
}

export class PaymentCreationThrottle {
  private windows = new Map<string, ThrottleWindow>();

  constructor(
    private readonly maxRequests = 10,
    private readonly windowMs = 60 * 1000,
  ) {}

  private key(userId: string, ip: string): string {
    return `${userId}:${ip}`;
  }

  isAllowed(userId: string, ip: string): boolean {
    const key = this.key(userId, ip);
    const window = this.windows.get(key);
    const now = Date.now();
    if (!window || now - window.windowStartedAt > this.windowMs) {
      this.windows.set(key, { count: 1, windowStartedAt: now });
      return true;
    }
    if (window.count >= this.maxRequests) return false;
    window.count += 1;
    return true;
  }
}
