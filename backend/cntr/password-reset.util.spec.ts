jest.mock('mjml', () =>
  jest.fn().mockReturnValue({ html: '<html>password-reset</html>', errors: [] }),
);
jest.mock('fs', () => ({
  readFileSync: jest
    .fn()
    .mockReturnValue(
      'Hi {{memberName}}, reset at {{resetUrl}}. Expires in {{expiryMinutes}} minutes. If you didn\'t request this, you can safely ignore this email.',
    ),
}));

import mjml2html from 'mjml';
import { renderPasswordResetEmail } from './password-reset.util';

const mockMjml = mjml2html as jest.MockedFunction<typeof mjml2html>;

describe('renderPasswordResetEmail', () => {
  it('returns HTML string from mjml', () => {
    const html = renderPasswordResetEmail({
      memberName: 'Alice',
      resetUrl: 'https://example.com/reset?token=abc',
      expiryMinutes: 30,
    });
    expect(html).toBe('<html>password-reset</html>');
  });

  it('substitutes memberName, resetUrl, and expiryMinutes', () => {
    renderPasswordResetEmail({
      memberName: 'Bob',
      resetUrl: 'https://example.com/reset?token=xyz',
      expiryMinutes: 60,
    });
    const arg = mockMjml.mock.calls[mockMjml.mock.calls.length - 1][0] as string;
    expect(arg).toContain('Bob');
    expect(arg).toContain('https://example.com/reset?token=xyz');
    expect(arg).toContain('60');
  });

  it('includes "did not request" disclaimer in the template', () => {
    renderPasswordResetEmail({
      memberName: 'Carol',
      resetUrl: 'https://example.com/reset',
      expiryMinutes: 30,
    });
    const arg = mockMjml.mock.calls[mockMjml.mock.calls.length - 1][0] as string;
    expect(arg).toContain("If you didn't request this");
  });

  it('does not contain unreplaced placeholders', () => {
    renderPasswordResetEmail({
      memberName: 'Dave',
      resetUrl: 'https://example.com/reset',
      expiryMinutes: 15,
    });
    const arg = mockMjml.mock.calls[mockMjml.mock.calls.length - 1][0] as string;
    expect(arg).not.toMatch(/\{\{[^}]+\}\}/);
  });

  it('throws when mjml returns errors', () => {
    mockMjml.mockReturnValueOnce({
      html: '',
      errors: [{ message: 'bad tag', tagName: 'mj-x', severity: 'error', line: 1 }],
    } as any);
    expect(() =>
      renderPasswordResetEmail({
        memberName: 'Eve',
        resetUrl: 'https://example.com/reset',
        expiryMinutes: 30,
      }),
    ).toThrow('MJML errors');
  });
});
