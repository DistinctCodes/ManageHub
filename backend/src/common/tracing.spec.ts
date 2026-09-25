import { SpanStatusCode } from '@opentelemetry/api';
import type { Span, Tracer } from '@opentelemetry/api';
import { setTracerForTesting, withSpan } from './tracing';

describe('withSpan', () => {
  let span: Span;
  let tracer: Tracer;

  beforeEach(() => {
    span = {
      setStatus: jest.fn(),
      recordException: jest.fn(),
      end: jest.fn(),
    } as unknown as Span;
    tracer = {
      startSpan: jest.fn().mockReturnValue(span),
    } as unknown as Tracer;
    setTracerForTesting(tracer);
  });

  afterEach(() => {
    setTracerForTesting(undefined);
  });

  it('returns the callback value and ends a successful span', async () => {
    const result = await withSpan('test.success', async () => 'result');

    expect(result).toBe('result');
    expect(span.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.OK,
    });
    expect(span.end).toHaveBeenCalledTimes(1);
  });

  it('rethrows callback errors after recording and ending the span', async () => {
    const error = new Error('callback failed');

    await expect(
      withSpan('test.failure', async () => {
        throw error;
      }),
    ).rejects.toBe(error);

    expect(span.recordException).toHaveBeenCalledWith(error);
    expect(span.setStatus).toHaveBeenCalledWith({
      code: SpanStatusCode.ERROR,
    });
    expect(span.end).toHaveBeenCalledTimes(1);
  });
});
