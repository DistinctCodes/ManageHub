import { retryWithBackoff } from './retry-with-backoff';

function fakeSleep(recorded: number[]) {
  return async (ms: number): Promise<void> => {
    recorded.push(ms);
  };
}

describe('retryWithBackoff', () => {
  it('returns the result on the first successful attempt without sleeping', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const sleep = jest.fn();

    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      sleep,
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries after a failure and eventually succeeds', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockRejectedValueOnce(new Error('boom again'))
      .mockResolvedValueOnce('ok');
    const delays: number[] = [];

    const result = await retryWithBackoff(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      sleep: fakeSleep(delays),
    });

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(delays).toHaveLength(2);
  });

  it('throws the last error once maxAttempts is exhausted', async () => {
    const error = new Error('always fails');
    const fn = jest.fn().mockRejectedValue(error);

    await expect(
      retryWithBackoff(fn, {
        maxAttempts: 3,
        baseDelayMs: 10,
        sleep: jest.fn(),
      }),
    ).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('fails fast on a terminal (non-retryable) error without exhausting attempts', async () => {
    class TerminalError extends Error {}
    const fn = jest.fn().mockRejectedValue(new TerminalError('bad request'));

    await expect(
      retryWithBackoff(fn, {
        maxAttempts: 5,
        baseDelayMs: 10,
        sleep: jest.fn(),
        isRetryable: (error) => !(error instanceof TerminalError),
      }),
    ).rejects.toThrow(TerminalError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('grows the delay exponentially and applies jitter within [delay, 1.1*delay]', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockRejectedValueOnce(new Error('3'))
      .mockResolvedValueOnce('ok');
    const delays: number[] = [];

    await retryWithBackoff(fn, {
      maxAttempts: 4,
      baseDelayMs: 100,
      sleep: fakeSleep(delays),
    });

    expect(delays).toHaveLength(3);
    expect(delays[0]).toBeGreaterThanOrEqual(100);
    expect(delays[0]).toBeLessThanOrEqual(110);
    expect(delays[1]).toBeGreaterThanOrEqual(200);
    expect(delays[1]).toBeLessThanOrEqual(220);
    expect(delays[2]).toBeGreaterThanOrEqual(400);
    expect(delays[2]).toBeLessThanOrEqual(440);
  });

  it('caps the delay at maxDelayMs', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce(new Error('1'))
      .mockRejectedValueOnce(new Error('2'))
      .mockResolvedValueOnce('ok');
    const delays: number[] = [];

    await retryWithBackoff(fn, {
      maxAttempts: 3,
      baseDelayMs: 100,
      maxDelayMs: 150,
      sleep: fakeSleep(delays),
    });

    // Second delay would be 200 uncapped; capped at 150 (+ up to 10% jitter).
    expect(delays[1]).toBeLessThanOrEqual(165);
  });

  it('rejects a maxAttempts less than 1', async () => {
    await expect(
      retryWithBackoff(jest.fn(), { maxAttempts: 0, baseDelayMs: 10 }),
    ).rejects.toThrow(/maxAttempts must be >= 1/);
  });
});
