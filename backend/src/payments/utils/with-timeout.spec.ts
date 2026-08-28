// backend/src/payments/utils/with-timeout.spec.ts
import { withTimeout } from './with-timeout';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve if promise resolves before timeout', async () => {
    const promise = Promise.resolve('success');
    const result = await withTimeout(promise, 1000);
    expect(result).toBe('success');
  });

  it('should reject if promise rejects before timeout', async () => {
    const promise = Promise.reject(new Error('failed'));
    await expect(withTimeout(promise, 1000)).rejects.toThrow('failed');
  });

  it('should time out if promise takes longer than specified duration', async () => {
    const slowPromise = new Promise((resolve) => setTimeout(resolve, 2000));
    const timeoutPromise = withTimeout(slowPromise, 500);

    jest.advanceTimersByTime(500);

    await expect(timeoutPromise).rejects.toThrow(/timeout/i);
  });

  it('should clear the underlying timer upon successful completion', async () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    const promise = Promise.resolve('fast');

    await withTimeout(promise, 1000);

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});