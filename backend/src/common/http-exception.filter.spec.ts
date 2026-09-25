import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter, redactSensitive } from './http-exception.filter';

describe('redactSensitive (issue #1779)', () => {
  it('redacts key=value style secrets and tokens', () => {
    expect(redactSensitive('auth failed: token=abc123.def456')).toBe(
      'auth failed: token=[REDACTED]',
    );
    expect(redactSensitive('bad request, password: "hunter2"')).toBe(
      'bad request, password=[REDACTED]',
    );
    expect(redactSensitive('Authorization=Bearer sk_live_abcdef')).toBe(
      'Authorization=[REDACTED]',
    );
  });

  it('redacts credentials inside a connection string, keeping scheme/host', () => {
    expect(
      redactSensitive(
        'connect ECONNREFUSED postgres://appuser:s3cr3t@db.internal:5432/app',
      ),
    ).toBe('connect ECONNREFUSED postgres://[REDACTED]@db.internal:5432/app');
  });

  it('redacts a bare JWT-shaped token with no key name attached', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
    expect(redactSensitive(`invalid session for ${jwt}`)).toBe(
      'invalid session for [REDACTED]',
    );
  });

  it('leaves ordinary messages untouched', () => {
    expect(redactSensitive('Booking not found')).toBe('Booking not found');
  });
});

describe('AllExceptionsFilter', () => {
  function buildHost(): {
    host: ArgumentsHost;
    json: jest.Mock;
    status: jest.Mock;
  } {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status, getHeader: jest.fn() };
    const request = { method: 'GET', url: '/wallets/link' };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;
    return { host, json, status };
  }

  it('redacts sensitive content out of the client-facing message', () => {
    const filter = new AllExceptionsFilter();
    const { host, json, status } = buildHost();

    filter.catch(
      new HttpException(
        'upstream rejected token=abc.def.ghi',
        HttpStatus.BAD_GATEWAY,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_GATEWAY);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'upstream rejected token=[REDACTED]',
      }),
    );
  });

  it('never leaks a raw non-HttpException message', () => {
    const filter = new AllExceptionsFilter();
    const { host, json } = buildHost();

    filter.catch(new Error('secret=topsecret while connecting'), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });
});
