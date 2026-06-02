jest.mock('mjml', () =>
  jest.fn().mockReturnValue({ html: '<html>2fa-enabled</html>', errors: [] }),
);
jest.mock('fs', () => ({
  readFileSync: jest
    .fn()
    .mockReturnValue(
      'Hi {{memberName}}, 2FA enabled at {{enabledAt}}. If this wasn\'t you, secure your account immediately. <a href="{{disableUrl}}">Disable 2FA</a>',
    ),
}));

import mjml2html from 'mjml';
import { renderTwoFactorEnabledEmail } from './two-factor-enabled.util';

const mockMjml = mjml2html as jest.MockedFunction<typeof mjml2html>;

describe('renderTwoFactorEnabledEmail', () => {
  it('returns the HTML string from mjml', () => {
    const html = renderTwoFactorEnabledEmail({
      memberName: 'Alice',
      enabledAt: '2026-06-01T12:00:00Z',
      disableUrl: 'https://example.com/disable-2fa',
    });
    expect(html).toBe('<html>2fa-enabled</html>');
  });

  it('substitutes memberName into the template before calling mjml', () => {
    renderTwoFactorEnabledEmail({
      memberName: 'Bob',
      enabledAt: '2026-06-01T12:00:00Z',
      disableUrl: 'https://example.com/disable',
    });
    const calledWith = mockMjml.mock.calls[mockMjml.mock.calls.length - 1][0] as string;
    expect(calledWith).toContain('Bob');
  });

  it('substitutes disableUrl into the template before calling mjml', () => {
    renderTwoFactorEnabledEmail({
      memberName: 'Carol',
      enabledAt: '2026-06-01T12:00:00Z',
      disableUrl: 'https://example.com/my-disable-url',
    });
    const calledWith = mockMjml.mock.calls[mockMjml.mock.calls.length - 1][0] as string;
    expect(calledWith).toContain('https://example.com/my-disable-url');
  });

  it('throws when mjml returns errors', () => {
    mockMjml.mockReturnValueOnce({
      html: '',
      errors: [{ message: 'bad tag', tagName: 'mj-x', severity: 'error', line: 1 }],
    } as any);
    expect(() =>
      renderTwoFactorEnabledEmail({
        memberName: 'Eve',
        enabledAt: '2026-06-01T12:00:00Z',
        disableUrl: 'https://example.com/disable',
      }),
    ).toThrow('MJML errors');
  });
});
